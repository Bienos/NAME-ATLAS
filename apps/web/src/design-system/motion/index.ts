import { motionTokens } from "../tokens/motion.js";

export const atlasMotion = {
  resolve: { duration: motionTokens.base, easing: motionTokens.resolve },
  locate: { duration: motionTokens.quick, easing: motionTokens.locate },
  unfold: { duration: motionTokens.unfold, easing: motionTokens.unfoldEase },
  connect: { duration: motionTokens.base, easing: motionTokens.resolve },
} as const;
