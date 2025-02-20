import { Elysia } from "elysia";
import { oauth2 } from "elysia-oauth2";
import { jwt } from "@elysiajs/jwt"; // Import the jwt middleware if you're using it
import { config } from "../utils/config";

export const oAuthRoute = new Elysia()
  .use(
    jwt({
      name: 'jwt',
      secret: 'Fischl von Luftschloss Narfidort', // Ideally, use an env variable
    })
  )
  .use(
    oauth2({
      Google: [
        config.googleAuth.clientId,
        config.googleAuth.clientSecret,
        config.googleAuth.callBack,
      ],
    }, {
      cookie: {
        secure: false, // Set to true in production with HTTPS
        sameSite: "lax",
        path: "/",
        httpOnly: true,
        maxAge: 60 * 30, // 30 minutes
      },
    })
  )
  // Initiate Google OAuth flow
  .get("/auth/google", async ({ oauth2, redirect }) => {
	const url = oauth2.createURL("Google", ["email", "profile"]);
    url.searchParams.set("access_type", "offline");
    return redirect(url.href);
  })
  // Callback endpoint: verify, create JWT, set cookie, and redirect
  .get("/auth/google/callback", async ({ oauth2, redirect, jwt, cookie: { auth } }) => {
	// Authorize with Google and get the token data
	const tokens = await oauth2.authorize("Google");
	
	// Extract the access token (this method may vary depending on your library)
	const accessToken = tokens.accessToken();
  
	// Fetch user profile info from Google
	const response = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
	  headers: {
		Authorization: `Bearer ${accessToken}`,
	  },
	});
	
	if (!response.ok) {
	  // Handle error appropriately
	  return redirect("/error"); // or send an error message
	}
	
	const userInfo = await response.json();
	console.log("User Info:", userInfo);
  
	// Sign a new JWT with the user information from Google
	const signedJwt = await jwt.sign({
	  email: userInfo.email,
	  name: userInfo.name,
	  picture: userInfo.picture,
	});
  
	// Set the JWT in an HTTP‑only cookie
	auth.set({
	  value: signedJwt,
	  httpOnly: true,
	  maxAge: 7 * 86400, // 7 days
	  path: "/profile",
	});
  
	// Redirect the user to the profile page
	return redirect("/profile");
  })
  // Protected route that greets the user
  .get("/profile", async ({ jwt, cookie: { auth }, set }) => {
    const profile = await jwt.verify(auth.value);

    if (!profile) {
      set.status = 401;
      return "Unauthorized";
    }

    return `Hello ${profile.name}, welcome back!`;
  })

console.log("Server is running on http://localhost:3000");