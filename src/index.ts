import express, { Request, Response } from "express";
import session from "express-session";
import passport from "./config/passport";
import { graphqlHTTP } from "express-graphql";
import { createSchema } from "./schema";
import dataSource from "./database/data-source";
import cors from "cors";
import dotenv from "dotenv";
import { isAuthenticated } from "./middleware/isAuthenticated";
import "./types/session";
import cookieParser from "cookie-parser";
import jwt, { VerifyErrors, JwtPayload } from "jsonwebtoken";




dotenv.config();

const app = express();
const port = 4000;
const JWT_SECRET = process.env.JWT_SECRET as string;
const BLACKLISTED_TOKENS = new Set<string>();
// Middleware
app.use(
  cors({
    origin: "http://localhost:5173",
    credentials: true, // Allow sending cookies
  })
);

app.use(express.json());
app.use(
  session({
    secret: process.env.SESSION_SECRET!,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: 1000 * 60 * 60 * 24, // 1 day
    },
  })
);
app.use(passport.initialize());
app.use(passport.session());
app.use(cookieParser());
// 🔹 GitHub Authentication Routes
app.get(
  "/auth/github",
  (req, res, next) => {
    req.session.signup = false;
    next();
  },
  
  passport.authenticate("github", { scope: ["user:email"] })
);

app.get(
  "/auth/github/signup",
  (req, res, next) => {
    (req.session as any).signup = false;

    next();
  },
  passport.authenticate("github", { scope: ["user:email"] })
);

// 🔹 GitHub Callback
app.get(
  "/auth/github/callback",
  passport.authenticate("github", { failureRedirect: "/login" }),
  (req, res) => {
    if (!req.user) {
      console.log("No user found in session");
      return res.redirect("http://localhost:5173/signin");
    }

    const token = jwt.sign(
      { userId: (req.user as any).userId },
      process.env.JWT_SECRET!,
      { expiresIn: "1d" }
    );

    res.cookie("authToken", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: 1000 * 60 * 60 * 24,
    });

    console.log("Token generated and cookie set:", token);

    req.session.save(() => {
      const redirectUrl = req.session.signup
        ? "http://localhost:5173/welcome"
        : "http://localhost:5173/dashboard";
      req.session.signup = false;
      console.log("Redirecting to:", redirectUrl);
      res.redirect(redirectUrl);
    });
  }
);
// 🔹 Check Authentication Status
if (!JWT_SECRET) {
  throw new Error("JWT_SECRET is not defined in environment variables.");
}

app.get("/auth/check", (req: Request, res: Response) => {
  const token = req.cookies?.authToken || req.headers.authorization?.split(" ")[1];

  if (!token || BLACKLISTED_TOKENS.has(token)) {
    console.log("Token invalid or blacklisted");
    return res.json({ isAuthenticated: false });
  }

  jwt.verify(token, JWT_SECRET, (err: VerifyErrors | null, decoded: JwtPayload | string | undefined) => {
    if (err || !decoded) {
      console.log("Token verification failed");
      return res.json({ isAuthenticated: false });
    }

    console.log("Token verified, user authenticated");
    return res.json({ isAuthenticated: true });
  });
});

// 🔹 Logout Route (Properly Clears Session & Cookies)
app.get("/auth/logout", (req: Request, res: Response) => {
  const token = req.cookies?.authToken || req.headers.authorization?.split(" ")[1];

  if (token) {
    BLACKLISTED_TOKENS.add(token); // Add the token to the blacklist
    console.log("Token blacklisted:", token);
  }

  req.session?.destroy((error: Error | null) => {
    if (error) {
      console.error("Session destruction error:", error);
      return res.status(500).json({ message: "Failed to destroy session" });
    }

    // Clear cookies
    res.clearCookie("authToken", { path: "/" });
    res.clearCookie("connect.sid", { path: "/" });

    console.log("Session destroyed and cookies cleared");

    // Send a response indicating successful logout
    return res.status(200).json({ message: "Logout successful" });
  });
});

// 🔹 GraphQL Endpoint
dataSource
  .initialize()
  .then(async () => {
    console.log("DB Connected");
    const schema = await createSchema();
    app.use("/graphql", graphqlHTTP({ schema, graphiql: true }));
    app.listen(port, () => console.log(`Server running at http://localhost:${port}/graphql`));
  })
  .catch((error) => console.error("Database Connection Error:", error));
