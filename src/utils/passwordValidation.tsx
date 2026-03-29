export const PASSWORD_REGEX = /^(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]).{8,}$/;

export const checkPasswordStrength = (password: string) => ({
  hasLength:    password.length >= 12,
  hasUppercase: /[A-Z]/.test(password),
  hasNumber:    /\d/.test(password),
  hasSpecial:   /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password),
});