declare module "react-simple-captcha" {
  export function loadCaptchaEnginge(length: number): void;
  export const LoadCanvasTemplate: import("react").ComponentType;
  export function validateCaptcha(value: string): boolean;
}
