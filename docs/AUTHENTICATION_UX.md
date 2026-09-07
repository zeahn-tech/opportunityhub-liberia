# OpportunityHub Liberia — Authentication UX & Flow Specification

## 1. Professional Registration & Login UI
* **Clean Forms**: Standard email, password, full name, and optional phone inputs with clear labels, focus states, validation feedback, and password visibility toggles.
* **Intent Preservation**: When a guest attempts a protected action (such as applying for a job or saving an opportunity), the application prompts them to sign in and seamlessly returns them to their intended destination upon successful authentication.
* **Error Handling**: Friendly, non-technical error messages (e.g., *"We couldn't sign you in with those details. Please check your email and password and try again."*) without exposing database internals.
* **Access Restricted UX**: Clear guidance when lacking workspace permissions without mentioning legacy persona terminology.
