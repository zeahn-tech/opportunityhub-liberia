const fs = require('fs');

let content = fs.readFileSync('src/components/auth/AuthModal.tsx', 'utf8');

const regex = /\{\/\*\s*Quick Persona Access for Testing \/ Evaluation\s*\*\/\}\s*<div className="mb-6 p-3 bg-\[#F9F8F6\][\s\S]*?<\/div>\s*<\/div>\s*<\/div>/;
content = content.replace(regex, '');

fs.writeFileSync('src/components/auth/AuthModal.tsx', content);

let navbar = fs.readFileSync('src/components/Navbar.tsx', 'utf8');

// Replace the User Profile / Account Menu in Navbar.tsx
const accountMenuRegex = /\{\/\* User Profile \/ Account Menu \*\/\}([\s\S]*?)<button\s*onClick=\{onOpenPostModal\}/;
const newAccountMenu = `{/* User Profile / Account Menu */}
          <div className="relative">
            <button
              onClick={() => setShowUserDropdown(!showUserDropdown)}
              className="flex items-center gap-2 pl-2 pr-2.5 py-1.5 bg-white border border-[#E8E4D9] rounded-xl hover:border-[#283618] transition-all cursor-pointer"
            >
              <div className="w-7 h-7 rounded-lg bg-[#283618] text-white flex items-center justify-center font-bold text-xs shadow-xs">
                {userInitials}
              </div>
              <div className="hidden xl:block text-left">
                <div className="text-xs font-bold text-[#132A13] leading-tight truncate max-w-[120px]">
                  {user.fullName}
                </div>
                <div className="text-[10px] text-[#606C38] leading-tight capitalize">
                  {activeOrganization ? activeOrganization.name : user.primaryRole?.replace('_', ' ')}
                </div>
              </div>
              <ChevronDown className="w-3 h-3 text-[#606C38]" />
            </button>

            {showUserDropdown && (
              <div className="absolute right-0 mt-2 w-64 bg-white rounded-2xl border border-[#E8E4D9] shadow-2xl p-2 z-50">
                <div className="px-3 py-2.5 border-b border-[#E8E4D9]">
                  <div className="font-bold text-xs text-[#132A13]">{user.fullName}</div>
                  <div className="text-[11px] text-[#606C38] truncate">{user.email}</div>
                  <div className="mt-1.5 flex items-center gap-1.5">
                    <span className="text-[10px] font-bold uppercase bg-[#ECF3E9] text-[#283618] px-2 py-0.5 rounded-full">
                      {user.accountStatus?.replace('_', ' ')}
                    </span>
                    {user.isEmailVerified && (
                      <span className="text-[10px] font-bold text-[#4F772D] flex items-center gap-0.5">
                        <Check className="w-3 h-3" /> Verified
                      </span>
                    )}
                  </div>
                </div>

                <div className="py-1 text-xs">
                  <button
                    onClick={() => {
                      setIsProfileModalOpen(true);
                      setShowUserDropdown(false);
                    }}
                    className="w-full text-left px-3 py-2 rounded-xl hover:bg-[#F9F8F6] text-[#283618] flex items-center gap-2 cursor-pointer font-medium"
                  >
                    <UserIcon className="w-3.5 h-3.5 text-[#606C38]" />
                    Profile
                  </button>

                  <button
                    onClick={() => {
                      setActiveTab('candidate');
                      setShowUserDropdown(false);
                    }}
                    className="w-full text-left px-3 py-2 rounded-xl hover:bg-[#F9F8F6] text-[#283618] flex items-center gap-2 cursor-pointer font-medium"
                  >
                    <Activity className="w-3.5 h-3.5 text-[#606C38]" />
                    My Activity
                  </button>
                  
                  <button
                    onClick={() => {
                      setActiveTab('candidate');
                      setShowUserDropdown(false);
                    }}
                    className="w-full text-left px-3 py-2 rounded-xl hover:bg-[#F9F8F6] text-[#283618] flex items-center gap-2 cursor-pointer font-medium"
                  >
                    <FileText className="w-3.5 h-3.5 text-[#606C38]" />
                    Applications
                  </button>
                  
                  <button
                    onClick={() => {
                      setActiveTab('opportunities');
                      setShowUserDropdown(false);
                    }}
                    className="w-full text-left px-3 py-2 rounded-xl hover:bg-[#F9F8F6] text-[#283618] flex items-center gap-2 cursor-pointer font-medium"
                  >
                    <Bookmark className="w-3.5 h-3.5 text-[#606C38]" />
                    Saved Opportunities
                  </button>
                  
                  <button
                    onClick={() => {
                      setActiveTab('messages');
                      setShowUserDropdown(false);
                    }}
                    className="w-full text-left px-3 py-2 rounded-xl hover:bg-[#F9F8F6] text-[#283618] flex items-center gap-2 cursor-pointer font-medium flex justify-between"
                  >
                    <div className="flex items-center gap-2">
                      <MessageSquare className="w-3.5 h-3.5 text-[#606C38]" />
                      Messages
                    </div>
                  </button>
                  
                  <button
                    onClick={() => {
                      setShowNotificationsModal(true);
                      setShowUserDropdown(false);
                    }}
                    className="w-full text-left px-3 py-2 rounded-xl hover:bg-[#F9F8F6] text-[#283618] flex items-center gap-2 cursor-pointer font-medium flex justify-between"
                  >
                    <div className="flex items-center gap-2">
                      <Bell className="w-3.5 h-3.5 text-[#606C38]" />
                      Notifications
                    </div>
                    {unreadNotifCount > 0 && (
                      <span className="bg-[#BC6C25] text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full">
                        {unreadNotifCount}
                      </span>
                    )}
                  </button>

                  <div className="my-1 border-t border-[#E8E4D9]"></div>

                  <button
                    onClick={() => {
                      setIsProfileModalOpen(true);
                      setShowUserDropdown(false);
                    }}
                    className="w-full text-left px-3 py-2 rounded-xl hover:bg-[#F9F8F6] text-[#283618] flex items-center gap-2 cursor-pointer font-medium"
                  >
                    <ShieldCheck className="w-3.5 h-3.5 text-[#606C38]" />
                    Security
                  </button>

                  <button
                    onClick={() => {
                      setIsProfileModalOpen(true);
                      setShowUserDropdown(false);
                    }}
                    className="w-full text-left px-3 py-2 rounded-xl hover:bg-[#F9F8F6] text-[#283618] flex items-center gap-2 cursor-pointer font-medium"
                  >
                    <Settings className="w-3.5 h-3.5 text-[#606C38]" />
                    Settings
                  </button>

                  <div className="my-1 border-t border-[#E8E4D9]"></div>

                  <button
                    onClick={() => {
                      logout();
                      setShowUserDropdown(false);
                    }}
                    className="w-full text-left px-3 py-2 rounded-xl hover:bg-[#FCF0E8] text-[#BC6C25] flex items-center gap-2 cursor-pointer font-medium"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    Sign Out
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Post Opportunity CTA */}
          <button
            onClick={onOpenPostModal}`;

navbar = navbar.replace(accountMenuRegex, newAccountMenu);
fs.writeFileSync('src/components/Navbar.tsx', navbar);
