// Client-side mock Lovable integration
import { supabase } from "../supabase/client";

export type OAuthProvider = "google" | "github" | "apple";

type SignInOptions = {
  redirect_uri?: string;
  extraParams?: Record<string, string>;
};

export const lovable = {
  auth: {
    signInWithOAuth: async (_provider: OAuthProvider, _opts?: SignInOptions) => {
      // Mock OAuth sign-in
      const res = await supabase.auth.signInWithPassword({
        email: "alex@wryto.dev",
        password: "mock-password",
      });
      return {
        redirected: false,
        error: res.error,
        tokens: null,
      };
    },
  },
};
