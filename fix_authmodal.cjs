const fs = require('fs');

let content = fs.readFileSync('src/components/auth/AuthModal.tsx', 'utf8');

// I need to replace from '{successMessage}</span>\n            </div>\n          )}' down to '<div className="grid grid-cols-1 sm:grid-cols-2 gap-3">\n                <div>\n                  <label className="block text-xs font-bold text-[#132A13] uppercase tracking-wider mb-1.5">\n                    Primary Role'

const regex = /\{\/\* Content Body \*\/\}[\s\S]*?<div className="grid grid-cols-1 sm:grid-cols-2 gap-3">\s*<div>\s*<label className="block text-xs font-bold text-\[#132A13\] uppercase tracking-wider mb-1\.5">\s*Primary Role/;

const correctContent = `{/* Content Body */}
        <div className="p-6 sm:p-8 max-h-[80vh] overflow-y-auto">
          {errorMessage && (
            <div className="mb-5 p-3.5 bg-[#FCF0E8] border border-[#BC6C25]/30 rounded-2xl flex items-start gap-3 text-xs text-[#BC6C25]">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}
          {successMessage && (
            <div className="mb-5 p-3.5 bg-[#ECF3E9] border border-[#4F772D]/30 rounded-2xl flex items-start gap-3 text-xs text-[#283618]">
              <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-[#4F772D]" />
              <span>{successMessage}</span>
            </div>
          )}

          {/* VIEW: LOGIN */}
          {authModalView === 'login' && (
            <form onSubmit={handleLoginSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-[#132A13] uppercase tracking-wider mb-1.5">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-[#606C38] absolute left-3.5 top-3" />
                  <input
                    type="email"
                    required
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    placeholder="Enter your email"
                    className="w-full pl-10 pr-4 py-2.5 bg-[#F9F8F6] border border-[#E8E4D9] rounded-xl text-sm focus:outline-none focus:border-[#283618]"
                  />
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-bold text-[#132A13] uppercase tracking-wider">
                    Password
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setAuthModalView('forgot_password');
                      setErrorMessage(null);
                    }}
                    className="text-xs text-[#BC6C25] font-bold hover:underline cursor-pointer"
                  >
                    Forgot Password?
                  </button>
                </div>
                <div className="relative">
                  <Lock className="w-4 h-4 text-[#606C38] absolute left-3.5 top-3" />
                  <input
                    type="password"
                    required
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    placeholder="Enter your password"
                    className="w-full pl-10 pr-4 py-2.5 bg-[#F9F8F6] border border-[#E8E4D9] rounded-xl text-sm focus:outline-none focus:border-[#283618]"
                  />
                </div>
              </div>
              <div className="pt-2">
                <Button type="submit" variant="primary" size="lg" className="w-full" isLoading={isLoading}>
                  Sign In
                </Button>
              </div>
              <div className="text-center pt-2 text-xs text-[#606C38]">
                Don't have an account?{' '}
                <button
                  type="button"
                  onClick={() => {
                    setAuthModalView('register');
                    setErrorMessage(null);
                  }}
                  className="font-bold text-[#283618] hover:underline cursor-pointer"
                >
                  Create Account
                </button>
              </div>
            </form>
          )}

          {/* VIEW: REGISTER */}
          {authModalView === 'register' && (
            <form onSubmit={handleRegisterSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-[#132A13] uppercase tracking-wider mb-1.5">
                  Full Name
                </label>
                <div className="relative">
                  <UserIcon className="w-4 h-4 text-[#606C38] absolute left-3.5 top-3" />
                  <input
                    type="text"
                    required
                    value={regFullName}
                    onChange={(e) => setRegFullName(e.target.value)}
                    placeholder="Enter your full name"
                    className="w-full pl-10 pr-4 py-2.5 bg-[#F9F8F6] border border-[#E8E4D9] rounded-xl text-sm focus:outline-none focus:border-[#283618]"
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-[#132A13] uppercase tracking-wider mb-1.5">
                    Email Address
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-[#606C38] absolute left-3.5 top-3" />
                    <input
                      type="email"
                      required
                      value={regEmail}
                      onChange={(e) => setRegEmail(e.target.value)}
                      placeholder="e.g. tamba@example.com"
                      className="w-full pl-10 pr-4 py-2.5 bg-[#F9F8F6] border border-[#E8E4D9] rounded-xl text-sm focus:outline-none focus:border-[#283618]"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#132A13] uppercase tracking-wider mb-1.5">
                    Phone Number
                  </label>
                  <div className="relative">
                    <Phone className="w-4 h-4 text-[#606C38] absolute left-3.5 top-3" />
                    <input
                      type="tel"
                      value={regPhone}
                      onChange={(e) => setRegPhone(e.target.value)}
                      placeholder="+231..."
                      className="w-full pl-10 pr-4 py-2.5 bg-[#F9F8F6] border border-[#E8E4D9] rounded-xl text-sm focus:outline-none focus:border-[#283618]"
                    />
                  </div>
                </div>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-[#132A13] uppercase tracking-wider mb-1.5">
                    Primary Role`;

content = content.replace(regex, correctContent);
fs.writeFileSync('src/components/auth/AuthModal.tsx', content);
