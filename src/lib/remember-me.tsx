import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

const FLAG = "inkline-remember";
const TAB = "inkline-session-alive";

export function setRememberMe(remember: boolean) {
  localStorage.setItem(FLAG, remember ? "1" : "0");
  sessionStorage.setItem(TAB, "1");
}

/** Signs the user out on a fresh browser session when they unchecked "Remember me". */
export function RememberMeGuard() {
  useEffect(() => {
    if (localStorage.getItem(FLAG) === "0" && !sessionStorage.getItem(TAB)) {
      localStorage.removeItem(FLAG);
      void supabase.auth.signOut();
    }
    sessionStorage.setItem(TAB, "1");
  }, []);
  return null;
}
