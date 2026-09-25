export const PASSWORD_MIN_LENGTH = 6;

export function getPasswordRequirements(password: string) {
  return [
    { key: "passwordRequirementLength", met: password.length >= PASSWORD_MIN_LENGTH },
    { key: "passwordRequirementUppercase", met: /[A-Z]/.test(password) },
    { key: "passwordRequirementLowercase", met: /[a-z]/.test(password) },
    { key: "passwordRequirementNumber", met: /[0-9]/.test(password) },
    { key: "passwordRequirementSymbol", met: /[^A-Za-z0-9\s]/.test(password) },
  ];
}

export function isStrongPassword(password: string): boolean {
  return getPasswordRequirements(password).every((requirement) => requirement.met);
}
