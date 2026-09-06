import { describe, it, expect, beforeEach } from 'vitest';
import { candidateService } from '../services/candidateService';
import { applicationService } from '../services/applicationService';
import { authService } from '../services/authService';
import { db } from '../db/dbClient';
import { CandidateProfile } from '../types';

describe('Candidate Profile & Application Management System Tests', () => {
  beforeEach(() => {
    db.resetToSeedDefaults();
  });

  describe('1. Candidate Profile Management & Persistence', () => {
    it('allows a job seeker to retrieve and update their full professional profile', async () => {
      authService.switchRole('job_seeker');
      const session = authService.getSession();
      const userId = session.user.id;

      const profileRes = await candidateService.getMyProfile();
      expect(profileRes.status).toBe(200);
      expect(profileRes.data).toBeDefined();
      expect(profileRes.data!.userId).toBe(userId);

      // Update candidate profile with comprehensive credentials
      const updatedProfile: CandidateProfile = {
        ...profileRes.data!,
        headline: 'Senior Supply Chain & Logistics Director',
        county: 'Montserrado',
        city: 'Monrovia',
        yearsOfExperience: 8,
        bio: 'Over 8 years managing cold-chain logistics, medical consumables, and fleet operations across Liberia.',
        skills: ['Supply Chain Logistics', 'Fleet Management', 'WFP Compliance', 'Warehouse Operations'],
        languages: [
          { language: 'English', proficiency: 'native' },
          { language: 'Kpelle', proficiency: 'professional' },
          { language: 'Liberian English (Kolokwa)', proficiency: 'native' }
        ],
        education: [
          {
            id: 'edu-1',
            institution: 'University of Liberia',
            degree: 'BSc in Economics & Public Administration',
            fieldOfStudy: 'Economics',
            startYear: '2014',
            endYear: '2018',
            county: 'Montserrado'
          }
        ],
        experience: [
          {
            id: 'exp-1',
            company: 'Save the Children Liberia',
            title: 'Logistics Coordinator',
            location: 'Monrovia & Gbarnga',
            startDate: '2020-01',
            endDate: '2024-05',
            isCurrent: false,
            description: 'Managed fleet of 25 4x4 vehicles and cold storage across Bong and Nimba.'
          }
        ],
        certifications: [
          {
            id: 'cert-1',
            name: 'Certified Supply Chain Professional (CSCP)',
            issuingOrganization: 'APICS / ASCM',
            issueDate: '2021-08'
          }
        ],
        portfolio: [
          {
            id: 'port-1',
            title: 'National Vaccine Cold-Chain Logistics Map 2023',
            url: 'https://example.com/coldchain-liberia'
          }
        ],
        cv: {
          id: 'cv-1',
          fileName: 'Tamba_Kollie_Executive_CV_2026.pdf',
          fileSize: 450000,
          uploadedAt: '2026-09-01T10:00:00Z',
          fileDataUrl: 'data:application/pdf;base64,JVBERi0xLjc...'
        }
      };

      const saveRes = await candidateService.updateMyProfile(updatedProfile);
      expect(saveRes.status).toBe(200);
      expect(saveRes.data!.headline).toBe('Senior Supply Chain & Logistics Director');
      expect(saveRes.data!.skills).toContain('WFP Compliance');
      expect(saveRes.data!.education[0].institution).toBe('University of Liberia');
      expect(saveRes.data!.cv?.fileName).toBe('Tamba_Kollie_Executive_CV_2026.pdf');
    });

    it('enforces privacy settings when an unauthorized viewer accesses a candidate profile', async () => {
      authService.switchRole('job_seeker');
      const session = authService.getSession();
      const candidateUserId = session.user.id;

      // 1. Set privacy settings to on_application_only
      await candidateService.updatePrivacySettings({
        profileVisibility: 'public',
        contactVisibility: 'on_application_only',
        cvDownloadPermission: 'applied_jobs_only'
      });

      // Switch to an unrelated employer with no active applications
      authService.switchRole('business_seller');

      const maskedRes = await candidateService.getPublicProfile(candidateUserId);
      expect(maskedRes.status).toBe(200);
      expect(maskedRes.data).toBeDefined();
      // Contact info should be masked and CV fileDataUrl stripped
      expect(maskedRes.data!.email).toBe('[Visible upon application]');
      expect(maskedRes.data!.phone).toBe('[Visible upon application]');
      if (maskedRes.data!.cv) {
        expect(maskedRes.data!.cv.fileDataUrl).toBeUndefined();
      }

      // 2. Set profileVisibility to hidden
      authService.switchRole('job_seeker');
      await candidateService.updatePrivacySettings({
        profileVisibility: 'hidden'
      });

      authService.switchRole('business_seller');
      const hiddenRes = await candidateService.getPublicProfile(candidateUserId);
      expect(hiddenRes.status).toBe(200);
      expect(hiddenRes.data).toBeNull();
    });
  });

  describe('2. Application Submission & Candidate Portal', () => {
    it('allows candidate to apply for a published vacancy with screening questions and cover note', async () => {
      authService.switchRole('job_seeker');
      const session = authService.getSession();

      const applyRes = await applicationService.submit({
        opportunityId: 'opp-1',
        opportunityTitle: 'Senior Logistics & Supply Chain Manager',
        organizationId: 'org-save-children',
        organizationName: 'Save the Children Liberia',
        candidateUserId: session.user.id,
        applicantName: session.user.fullName || 'Tamba Kollie',
        applicantEmail: session.user.email,
        applicantPhone: '+231 77 554 9912',
        applicantLocation: 'Montserrado',
        coverNote: 'Experienced humanitarian logistics professional ready to lead operations.',
        screeningAnswers: {
          0: 'Yes, over 8 years managing humanitarian vehicle fleets in Liberia.',
          1: 'I hold an advanced APICS supply chain credential.'
        },
        resumeUrl: 'data:application/pdf;base64,JVBERi0xLjc...'
      });

      expect(applyRes.status).toBe(200);
      expect(applyRes.data).toBeDefined();
      expect(applyRes.data!.stage).toBe('applied');
      expect(applyRes.data!.opportunityId).toBe('opp-1');
      expect(applyRes.data!.history).toHaveLength(1);
      expect(applyRes.data!.history[0].stage).toBe('applied');

      // Candidate lists their applications
      const myAppsRes = await applicationService.listMyApplications();
      expect(myAppsRes.status).toBe(200);
      const found = myAppsRes.data!.find((a) => a.opportunityId === 'opp-1');
      expect(found).toBeDefined();
    });

    it('allows candidate to withdraw an active application with an audit record', async () => {
      authService.switchRole('job_seeker');
      const session = authService.getSession();

      // Submit an application
      const applyRes = await applicationService.submit({
        opportunityId: 'opp-2',
        opportunityTitle: 'Highway Maintenance Culvert Construction Tender',
        organizationId: 'org-mpw',
        organizationName: 'Ministry of Public Works',
        candidateUserId: session.user.id,
        applicantName: 'Tamba Kollie',
        applicantEmail: 'tamba.kollie@gmail.com',
        coverNote: 'Consultancy bid.'
      });

      const appId = applyRes.data!.id;

      // Withdraw application
      const withdrawRes = await applicationService.withdraw(appId, 'Accepted another position elsewhere');
      expect(withdrawRes.status).toBe(200);
      expect(withdrawRes.data!.stage).toBe('withdrawn');
      expect(withdrawRes.data!.history.some((h) => h.stage === 'withdrawn')).toBe(true);
    });
  });

  describe('3. Recruiter Pipeline & Candidate Lifecycle Management', () => {
    it('allows employer to transition candidate through entire hiring pipeline', async () => {
      // Create fresh application as candidate
      authService.switchRole('job_seeker');
      const candidateUser = authService.getSession().user;

      const appRes = await applicationService.submit({
        opportunityId: 'opp-1',
        opportunityTitle: 'Senior Logistics & Supply Chain Manager',
        organizationId: 'org-save-children',
        organizationName: 'Save the Children Liberia',
        candidateUserId: candidateUser.id,
        applicantName: 'Tamba Kollie',
        applicantEmail: candidateUser.email,
        applicantPhone: '+231 77 554 9912',
        applicantLocation: 'Montserrado'
      });

      const appId = appRes.data!.id;

      // Switch to Employer
      authService.switchRole('employer');

      // 1. Advance to Shortlisted
      const shortlistRes = await applicationService.updateStage(appId, 'shortlisted', {
        note: 'Strong experience in Liberian humanitarian logistics.'
      });
      expect(shortlistRes.status).toBe(200);
      expect(shortlistRes.data!.stage).toBe('shortlisted');

      // 2. Schedule Interview
      const interviewRes = await applicationService.updateStage(appId, 'interview', {
        interviewDetails: {
          scheduledAt: '2026-09-12T14:00:00Z',
          mode: 'video',
          locationOrLink: 'https://meet.google.com/xyz-lib-safe',
          interviewerNames: ['Dr. Evelyn Fahnbulleh', 'Korto Flomo'],
          notes: 'Technical assessment of supply chain routing in Nimba County.'
        },
        note: 'Invited candidate to technical panel interview.'
      });
      expect(interviewRes.status).toBe(200);
      expect(interviewRes.data!.stage).toBe('interview');
      expect(interviewRes.data!.interviewDetails).toBeDefined();
      expect(interviewRes.data!.interviewDetails!.mode).toBe('video');

      // 3. Issue Formal Hiring Offer
      const offerRes = await applicationService.updateStage(appId, 'offer', {
        hiringOfferDetails: {
          offeredSalary: 2800,
          currency: 'USD',
          startDate: '2026-10-01',
          contractType: 'full_time',
          expiryDate: '2026-09-25',
          offerLetterUrl: 'https://example.com/offers/save_children_tk2026.pdf',
          terms: 'Standard humanitarian executive contract with field vehicle allowance.'
        },
        note: 'Official offer letter generated and dispatched.'
      });
      expect(offerRes.status).toBe(200);
      expect(offerRes.data!.stage).toBe('offer');
      expect(offerRes.data!.hiringOfferDetails!.offeredSalary).toBe(2800);

      // 4. Mark Candidate as Hired
      const hiredRes = await applicationService.updateStage(appId, 'hired', {
        note: 'Candidate accepted offer. Onboarding scheduled for Oct 1st.'
      });
      expect(hiredRes.status).toBe(200);
      expect(hiredRes.data!.stage).toBe('hired');

      // Verify audit history trail
      expect(hiredRes.data!.history.length).toBeGreaterThanOrEqual(4);
    });

    it('allows recruiter to reject an applicant with transparent reason', async () => {
      authService.switchRole('job_seeker');
      const applyRes = await applicationService.submit({
        opportunityId: 'opp-1',
        opportunityTitle: 'Senior Logistics & Supply Chain Manager',
        organizationId: 'org-save-children',
        organizationName: 'Save the Children Liberia',
        applicantName: 'Applicant To Reject',
        applicantEmail: 'reject.me@example.com'
      });
      const appId = applyRes.data!.id;

      // Switch to employer
      authService.switchRole('employer');

      const rejectRes = await applicationService.updateStage(appId, 'rejected', {
        rejectionReason: 'Position closed due to budget realignment.'
      });

      expect(rejectRes.status).toBe(200);
      expect(rejectRes.data!.stage).toBe('rejected');
      expect(rejectRes.data!.rejectionReason).toBe('Position closed due to budget realignment.');
    });

    it('allows recruiter to score and save candidate evaluations', async () => {
      authService.switchRole('employer');
      const apps = db.getApplications();
      const testApp = apps[0];

      const evalRes = await applicationService.updateEvaluation(testApp.id, {
        rating: 5,
        strengths: ['Extensive field logistics experience', 'Excellent team leadership'],
        improvements: ['Needs familiarity with new digital customs declarations'],
        internalNotes: 'Top recommended candidate for national logistics lead role.'
      });

      expect(evalRes.status).toBe(200);
      expect(evalRes.data!.evaluations).toBeDefined();
      expect(evalRes.data!.evaluations!.rating).toBe(5);
      expect(evalRes.data!.evaluations!.strengths).toContain('Extensive field logistics experience');
    });
  });
});
