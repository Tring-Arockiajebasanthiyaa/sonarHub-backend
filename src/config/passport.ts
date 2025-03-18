import passport from "passport";
import { Strategy as GitHubStrategy } from "passport-github2";
import { User } from "../modules/user/entity/user.entity";
import dataSource from "../database/data-source";
import jwt from "jsonwebtoken";
import { sendEmail } from "../utils/emailService";

passport.use(
  new GitHubStrategy(
    {
      clientID: process.env.GITHUB_CLIENT_ID!,
      clientSecret: process.env.GITHUB_CLIENT_SECRET!,
      callbackURL: process.env.GITHUB_CALLBACK_URL!,
      scope: ["user:email"],
      passReqToCallback: true,
      authorizationURL: "https://github.com/login/oauth/authorize?prompt=login", // Force login page
    },
    async (req: any, accessToken: string, refreshToken: string, profile: any, done: any) => {
      try {
        console.log("GitHub profile received:", profile);

        if (!dataSource.isInitialized) {
          await dataSource.initialize();
        }

        const email = profile.emails?.[0]?.value || `${profile.username}@github.com`;

        let user = await dataSource.getRepository(User).findOne({ where: { githubId: profile.id } });

        if (!user) {
          console.log("New user detected, creating an account.");
          user = dataSource.getRepository(User).create({
            name: profile.displayName || profile.username,
            email,
            githubId: profile.id,
          });
          await dataSource.getRepository(User).save(user);
          
          // Send email to user
          await sendEmail(user.email, "Welcome!", "Your account has been created successfully.");

          // Send email to admin
          await sendEmail(process.env.ADMIN_EMAIL!, "New User Registered", `A new user (${user.email}) has signed up.`);
        }

        const token = jwt.sign({ userId: user.userId }, process.env.JWT_SECRET!, { expiresIn: "1h" });

        done(null, { user, token });
      } catch (error) {
        console.error("GitHub OAuth Error:", error);
        done(error, null);
      }
    }
  )
);

// Serialize user session
passport.serializeUser((data: any, done) => {
  done(null, data?.user?.userId || null);
});

// Deserialize user session
passport.deserializeUser(async (userId: string, done) => {
  try {
    if (!userId) return done(null, null);
    
    const user = await dataSource.getRepository(User).findOne({ where: { userId } });
    done(null, user);
  } catch (error) {
    console.error("Deserialization Error:", error);
    done(error, null);
  }
});

export default passport;
