import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";

interface AuthPageProps {
  onAuth: () => void;
}

export function AuthPage({ onAuth }: AuthPageProps) {
  const [isLogin, setIsLogin] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      if (isLogin) {
        await apiRequest("POST", "/api/auth/login", { email });
      } else {
        await apiRequest("POST", "/api/auth/register", { name, email });
      }
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
      toast({ title: isLogin ? "Welcome back!" : "Account created!" });
      onAuth();
    } catch (err: any) {
      const msg = err?.message || "Something went wrong";
      try {
        const parsed = JSON.parse(msg.split(": ").slice(1).join(": "));
        setError(parsed.error || msg);
      } catch {
        if (msg.includes("409")) {
          setError("An account with this email already exists. Please sign in instead.");
        } else if (msg.includes("404")) {
          setError("No account found with this email. Please sign up first.");
        } else {
          setError(msg);
        }
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex items-center justify-center gap-2 mb-4">
            <div className="flex items-center justify-center w-10 h-10 rounded-md bg-primary text-primary-foreground font-bold text-lg">
              C
            </div>
            <span className="text-xl font-bold">CricketIQ</span>
          </div>
          <CardTitle data-testid="text-auth-title">
            {isLogin ? "Welcome Back" : "Create Your Account"}
          </CardTitle>
          <CardDescription>
            {isLogin
              ? "Enter your email to sign in"
              : "Enter your name and email to get started"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {!isLogin && (
              <div className="space-y-2">
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  data-testid="input-name"
                  type="text"
                  placeholder="Your name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required={!isLogin}
                  disabled={isLoading}
                />
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                data-testid="input-email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={isLoading}
              />
            </div>

            {error && (
              <p className="text-sm text-destructive" data-testid="text-auth-error">
                {error}
              </p>
            )}

            <Button
              type="submit"
              className="w-full"
              disabled={isLoading}
              data-testid="button-auth-submit"
            >
              {isLoading
                ? "Please wait..."
                : isLogin
                  ? "Sign In"
                  : "Create Account"}
            </Button>

            <div className="text-center text-sm">
              <span className="text-muted-foreground">
                {isLogin ? "Don't have an account? " : "Already have an account? "}
              </span>
              <button
                type="button"
                className="text-primary underline-offset-4 hover:underline"
                onClick={() => {
                  setIsLogin(!isLogin);
                  setError("");
                }}
                data-testid="button-toggle-auth-mode"
              >
                {isLogin ? "Sign up" : "Sign in"}
              </button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
