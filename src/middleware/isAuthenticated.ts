import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

// Extend Express Request to include `user`
interface AuthenticatedRequest extends Request {
  user?: any;
}

export const isAuthenticated = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  const token = req.cookies?.authToken; // Ensure cookies exist

  if (!token) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET as string);
    req.user = decoded; // Attach user data
    next();
  } catch (err) {
    return res.status(401).json({ message: "Invalid token" });
  }
};
