/** Provide native functions */

import { LoxCallable } from "./callable";

export const clock: LoxCallable = {
  airity: () => 0,
  call: () => {
    return Date.now();
  },
};
