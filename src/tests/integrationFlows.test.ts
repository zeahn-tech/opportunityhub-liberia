import { describe, it, expect, beforeEach } from 'vitest';
import { db } from '../db/dbClient';
import { authService } from '../services/authService';
import { applicationService } from '../services/applicationService';
import { OrgRole, OrgPermission, OrganizationSubscription } from '../types';

// applicationService is still imported here ONLY for the guest/401 guard
// in FLOW 2 below (`listMyApplications()` while logged out) -- that check
// throws UnauthorizedError before ever reaching Supabase, so it's safe to
// exercise the real service in this sandbox. Every other applicationService
// call in this file was retargeted to dbClient.ts directly as of Phase 3,
// Service 3 -- see src/tests/candidateAndApplication.test.ts's header
// comment for the full rationale.
describe('OpportunityHub Liberia — Integration & Regression Flow Suite', () => {
  const testPassword = 'StrongPassword2026!';

  beforeEach(() => {
    db.resetToSeedDefaults();
  });

  it('FLOW 1: Guest -> Browse -> Register -> Verify -> Onboard -> Logout', async () => {
    // 1. Browse (Access published opportunities as guest)
    const publicOpps = db.getOpportunities().filter(o => o.status === 'published');
    expect(publicOpps.length).toBeGreaterThan(0);

    // 2. Register
    const email = 'flow1.guest@opportunityhub.lr';
    const regResult = await db.registerUser({
      email,
      password: testPassword,
      fullName: 'Tamba Sumo Flow1',
      primaryRole: 'job_seeker',
      primaryCounty: 'Montserrado'
    });

    expect(regResult.user).toBeDefined();
    expect(regResult.user.email).toBe(email);
    expect(regResult.user.isEmailVerified).toBe(false);

    // 3. Verify Email (Query correct emailVerificationToken from storage)
    const cred = db.getCredentials().find(c => c.userId === regResult.user.id);
    const token = cred?.emailVerificationToken;
    expect(token).toBeDefined();

    const verifiedUser = db.verifyEmail(token!);
    expect(verifiedUser.isEmailVerified).toBe(true);

    // 4. Onboard (set profile & info)
    const updated = db.updateUserProfile(regResult.user.id, {
      fullName: 'Tamba Sumo Flow1 Updated',
      county: 'Nimba'
    }, regResult.user.id);
    expect(updated.user.fullName).toBe('Tamba Sumo Flow1 Updated');
    expect(updated.user.primaryCounty).toBe('Nimba');

    // 5. Logout (Terminate session)
    db.revokeSession(regResult.session.token);
    const sessionCheck = db.getSessions().find(s => s.token === regResult.session.token);
    expect(sessionCheck?.isValid).toBe(false);
  });

  it('FLOW 2: Guest -> Browse -> Apply -> Login prompt -> Login -> Return to original opportunity -> Apply', async () => {
    // 1. Guest browses opportunities & selects one
    const opps = db.getOpportunities().filter(o => o.status === 'published');
    const selectedOpp = opps[0];
    expect(selectedOpp).toBeDefined();

    // 2. Attempt to view personal application dashboard (which requires authentication and returns unauthorized status)
    await authService.logout(); // Ensure guest state
    const myAppsResult = await applicationService.listMyApplications();
    expect(myAppsResult.status).toBe(401);
    expect(myAppsResult.error?.code).toBe('UNAUTHORIZED');

    // 3. Login/Register to acquire a session
    const registered = await db.registerUser({
      email: 'flow2.auth@opportunityhub.lr',
      password: testPassword,
      fullName: 'Flow2 Applicant',
      primaryRole: 'job_seeker'
    });
    
    const cred = db.getCredentials().find(c => c.userId === registered.user.id);
    db.verifyEmail(cred!.emailVerificationToken!);

    // Set authenticated user context
    authService.loginAsUserForTest(registered.user.id);

    // 4. Return to original opportunity & apply successfully with session
    const authSubmit = db.createApplication(
      {
        opportunityId: selectedOpp.id,
        opportunityTitle: selectedOpp.title,
        organizationName: selectedOpp.organization.name,
        applicantName: 'Flow2 Applicant',
        applicantEmail: 'flow2.auth@opportunityhub.lr',
        applicantPhone: '+231 77 123 4567'
      },
      registered.user.id
    );

    expect(authSubmit).toBeDefined();
    expect(authSubmit.applicantName).toBe('Flow2 Applicant');
    expect(authSubmit.opportunityId).toBe(selectedOpp.id);
  });

  it('FLOW 3: User -> Create organization -> Become owner -> Invite member -> Member accepts -> Member accesses workspace', async () => {
    // 1. User registers
    const ownerReg = await db.registerUser({
      email: 'org.owner@opportunityhub.lr',
      password: testPassword,
      fullName: 'Org Owner',
      primaryRole: 'employer'
    });

    // 2. Create organization
    const org = db.createOrganization({
      name: 'Flow3 Tech Solutions',
      type: 'private_company',
      industry: 'Technology',
      county: 'Montserrado',
      address: 'Tubman Boulevard, Monrovia',
      website: 'https://flow3tech.lr',
      description: 'Liberian technology consulting firm'
    } as any, ownerReg.user.id);

    expect(org).toBeDefined();
    expect(org.name).toBe('Flow3 Tech Solutions');

    // User automatically becomes owner
    const ownerMembership = db.getMembershipsByUserId(ownerReg.user.id).find(m => m.organizationId === org.id);
    expect(ownerMembership).toBeDefined();
    expect(ownerMembership?.orgRole).toBe('owner');

    // 3. Invite member
    const inviteeEmail = 'org.member@opportunityhub.lr';
    const invitation = db.createInvitation(
      org.id,
      inviteeEmail,
      'member',
      ['jobs.view', 'applications.view'],
      ownerReg.user.id
    );
    expect(invitation).toBeDefined();
    expect(invitation.inviteeEmail).toBe(inviteeEmail);
    expect(invitation.status).toBe('pending');

    // 4. Member registers with matching email and accepts invitation
    const memberReg = await db.registerUser({
      email: inviteeEmail,
      password: testPassword,
      fullName: 'Org Member',
      primaryRole: 'employer'
    });

    const acceptedMembership = db.acceptInvitation(invitation.token, memberReg.user.id);
    expect(acceptedMembership).toBeDefined();
    expect(acceptedMembership.orgRole).toBe('member');
    expect(acceptedMembership.organizationId).toBe(org.id);

    // 5. Member accesses workspace
    const memberWorkspaceOpps = db.getOpportunitiesByTenant(org.id);
    expect(memberWorkspaceOpps).toBeDefined();
  });

  it('FLOW 4: Recruiter -> Organization -> Subscription -> Recruiter workspace -> Manage candidates', async () => {
    // 1. Set Recruiter context
    authService.loginAsRoleForTest('employer');
    const currentUser = db.getUsers().find(u => u.primaryRole === 'employer');
    expect(currentUser).toBeDefined();

    const orgs = db.getOrganizations();
    expect(orgs.length).toBeGreaterThan(0);
    const recruiterOrg = orgs[0];

    // 2. Manage Subscription
    const testSubscription: OrganizationSubscription = {
      id: `sub-${Date.now()}`,
      organizationId: recruiterOrg.id,
      planId: 'pro-plan',
      tier: 'pro',
      status: 'active',
      billingCycle: 'monthly',
      currentPeriodStart: new Date().toISOString(),
      currentPeriodEnd: new Date(Date.now() + 30 * 86400 * 1000).toISOString(),
      cancelAtPeriodEnd: false,
      stripeSubscriptionId: 'sub_flow4_stripe_mock',
      updatedAt: new Date().toISOString()
    };
    db.saveOrganizationSubscription(testSubscription);

    const subscriptionResult = db.getOrganizationSubscription(recruiterOrg.id);
    expect(subscriptionResult).toBeDefined();
    expect(subscriptionResult?.tier).toBe('pro');
    expect(subscriptionResult?.status).toBe('active');

    // 3. Recruiter Workspace - Manage Candidates
    const apps = db.getApplications();
    expect(apps.length).toBeGreaterThan(0);
    const candidateApp = apps[0];

    // Recruiter transitions application stage to 'interview'
    const updateRes = db.updateApplicationStage(
      candidateApp.id,
      'interview',
      { note: 'Excellent resume, scheduled interview.' },
      candidateApp.organizationId,
      currentUser!.id
    );
    expect(updateRes).toBeDefined();
    expect(updateRes.stage).toBe('interview');
  });

  it('FLOW 5: Candidate -> Apply -> Track application -> Receive messages', async () => {
    // 1. Candidate registers & logs in
    const candidateReg = await db.registerUser({
      email: 'flow5.candidate@opportunityhub.lr',
      password: testPassword,
      fullName: 'Flow5 Candidate',
      primaryRole: 'job_seeker'
    });
    const cred = db.getCredentials().find(c => c.userId === candidateReg.user.id);
    db.verifyEmail(cred!.emailVerificationToken!);
    authService.loginAsUserForTest(candidateReg.user.id);

    // 2. Apply to opportunity
    const opp = db.getOpportunities()[0];
    const submitRes = db.createApplication(
      {
        opportunityId: opp.id,
        opportunityTitle: opp.title,
        organizationName: opp.organization.name,
        applicantName: 'Flow5 Candidate',
        applicantEmail: 'flow5.candidate@opportunityhub.lr',
        applicantPhone: '+231 77 000 1111'
      },
      candidateReg.user.id
    );
    const createdAppId = submitRes.id;

    // 3. Track Application
    const trackApps = db.getApplications().filter(a => a.applicantEmail === 'flow5.candidate@opportunityhub.lr');
    expect(trackApps.length).toBe(1);
    expect(trackApps[0].id).toBe(createdAppId);

    // 4. Send & Receive Messages
    const conversationId = `conv-${Date.now()}`;
    const sentMsg = db.sendMessage({
      conversationId,
      senderId: candidateReg.user.id,
      senderName: 'Flow5 Candidate',
      recipientId: 'user-recruiter-1',
      body: 'Hello, looking forward to the logistics post!'
    });
    expect(sentMsg).toBeDefined();
    expect(sentMsg.body).toBe('Hello, looking forward to the logistics post!');

    const convMessages = db.getMessagesForConversation(conversationId);
    expect(convMessages.length).toBe(1);
    expect(convMessages[0].id).toBe(sentMsg.id);
  });

  it('FLOW 6: Business seller -> Create business listing -> Manage listing', async () => {
    // 1. Register business seller
    const sellerReg = await db.registerUser({
      email: 'flow6.seller@opportunityhub.lr',
      password: testPassword,
      fullName: 'Flow6 Seller',
      primaryRole: 'business_seller'
    });

    // 2. Create listing
    const listing = db.createBusiness({
      title: 'Monrovia Modern Printing Press',
      industry: 'Manufacturing',
      county: 'Montserrado',
      askingPriceUSD: 85000,
      revenueAnnualUSD: 120000,
      ebitdaAnnualUSD: 35000,
      isConfidential: true,
      description: 'Fully operational printing press near downtown Monrovia.',
      ownerUserId: sellerReg.user.id
    } as any, sellerReg.user.id);

    expect(listing).toBeDefined();
    expect(listing.title).toBe('Monrovia Modern Printing Press');
    expect(listing.ownerUserId).toBe(sellerReg.user.id);

    // 3. Manage listing (updating asking price)
    listing.askingPriceUSD = 80000;
    const updatedListing = db.updateBusiness(listing.id, listing, sellerReg.user.id);
    expect(updatedListing.askingPriceUSD).toBe(80000);
  });

  it('FLOW 7: Buyer -> Browse -> Request information', async () => {
    // 1. Register buyer
    const buyerReg = await db.registerUser({
      email: 'flow7.buyer@opportunityhub.lr',
      password: testPassword,
      fullName: 'Flow7 Buyer',
      primaryRole: 'investor_buyer'
    });

    // 2. Browse listings
    const listings = db.getBusinesses();
    expect(listings.length).toBeGreaterThan(0);
    const confidentialListing = listings.find(l => l.isConfidential);
    expect(confidentialListing).toBeDefined();

    // 3. Request confidential NDA information (local demo-mode data layer
    // -- businessService.ts's real Supabase-backed requestNdaAccess() now
    // requires seller approval before unlocking anything; see
    // src/services/businessService.ts's header comment and
    // docs/PHASE3_SERVICE5_VERIFICATION.md)
    authService.loginAsRoleForTest('investor_buyer');
    const buyerSession = authService.getSession();
    db.grantBusinessAccess(confidentialListing!.id, buyerSession.user.id);

    const checkListing = db.getBusinessById(confidentialListing!.id);
    expect(checkListing?.accessGranted).toBe(true);
  });

  it('FLOW 8: Unauthorized user -> Attempt protected resource -> Access denied -> No data leakage', async () => {
    // 1. Register normal job seeker
    const normalReg = await db.registerUser({
      email: 'flow8.normal@opportunityhub.lr',
      password: testPassword,
      fullName: 'Normal User',
      primaryRole: 'job_seeker'
    });

    // 2. Attempt to switch user role of someone else or switch to platform_admin when not authorized
    authService.loginAsUserForTest(normalReg.user.id);
    expect(() => {
      authService.switchRole('platform_admin');
    }).toThrow(/Platform Administrator/);

    // 3. Attempt to fetch a random organization opportunity without membership (if private / draft)
    const orgs = db.getOrganizations();
    expect(orgs.length).toBeGreaterThan(0);
    const privateOrg = orgs[0];

    // Member-only method should fail when not a member of that org
    expect(() => {
      db.getOrganizationInvitations(privateOrg.id, normalReg.user.id);
    }).toThrow(/Cross-tenant/);
  });

  it('FLOW 9: User -> Switch organization -> Identity remains unchanged', async () => {
    // 1. Register user
    const userReg = await db.registerUser({
      email: 'flow9.user@opportunityhub.lr',
      password: testPassword,
      fullName: 'Flow9 Switcher',
      primaryRole: 'employer'
    });

    // 2. Join organization 1
    const org1 = db.createOrganization({
      name: 'Flow9 Org One',
      type: 'private_company',
      industry: 'Agriculture',
      county: 'Nimba',
      address: 'Ganta',
      description: 'First Org'
    } as any, userReg.user.id);

    // Join organization 2
    const org2 = db.createOrganization({
      name: 'Flow9 Org Two',
      type: 'private_company',
      industry: 'Education',
      county: 'Bong',
      address: 'Gbarnga',
      description: 'Second Org'
    } as any, userReg.user.id);

    const userProfileBefore = db.getUserProfile(userReg.user.id);
    expect(userProfileBefore).toBeDefined();

    // 3. Simulate switching active org context
    const switchedOrgOpps = db.getOpportunitiesByTenant(org2.id);
    expect(switchedOrgOpps).toBeDefined();

    // Verify identity claims are fully unchanged
    const userProfileAfter = db.getUserProfile(userReg.user.id);
    expect(userProfileAfter?.headline).toBe(userProfileBefore?.headline);
    expect(userProfileAfter?.bio).toBe(userProfileBefore?.bio);
  });

  it('FLOW 10: Logout -> Guest -> No private data remains accessible', async () => {
    // 1. Log out
    await authService.logout();

    // Verification decision must throw when guest
    await expect(async () => {
      await db.decideOrganizationVerification('some-id', 'approved', 'verified_company', undefined, 'guest-or-unauthorized');
    }).rejects.toThrow();
  });
});
