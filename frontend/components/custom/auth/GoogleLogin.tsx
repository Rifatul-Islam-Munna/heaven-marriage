import { loginWithGoogle } from "@/actions/auth";
import {
  GoogleOAuthProvider,
  GoogleLogin,
  CredentialResponse,
} from "@react-oauth/google";
import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

function LoginWithGoogle() {
  const router = useRouter();

  const { mutate, isPending } = useMutation({
    mutationKey: ["loginWithGoogle"],
    mutationFn: (idToken: string) => loginWithGoogle(idToken),
    onSuccess: (data) => {
      if (data?.error) {
        return toast.error(data?.error?.message || "Login failed");
      }
      return router.push("/profile");
    },
    onError: (error) => {
      console.error("Login failed:", error);
      toast.error(error.message || "Login failed");
    },
  });
  const handleGoogleSuccess = async (
    credentialResponse: CredentialResponse,
  ) => {
    const idToken = credentialResponse.credential;
    if (!idToken) return toast.error("Login failed");
    mutate(idToken);
    console.log("idToken", idToken);
    console.log("credentialResponse", credentialResponse);
  };

  return (
    <GoogleOAuthProvider
      clientId={process.env.NEXT_PUBLIC_GOOGLE_OAUTH_CLIENT_ID ?? ""}
    >
      {isPending ? (
        <div>Login In Please wait...</div>
      ) : (
        <GoogleLogin
          onSuccess={handleGoogleSuccess}
          onError={() => console.log("Login Failed")}
        />
      )}
    </GoogleOAuthProvider>
  );
}
export default LoginWithGoogle;
