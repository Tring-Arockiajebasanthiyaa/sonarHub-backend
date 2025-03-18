import { Arg, Mutation, Query, Resolver } from "type-graphql";
import { User } from "./entity/user.entity";
import dataSource from "../../database/data-source";
import jwt from "jsonwebtoken";
import { LoginResponse } from "../LoginResponse";

@Resolver()
export class AuthResolver {
  // Login Mutation
  @Mutation(() => LoginResponse)
  async loginWithGitHub(@Arg("githubId") githubId: string): Promise<LoginResponse> {
    // Find the user by their GitHub ID
    const user = await dataSource.getRepository(User).findOne({ where: { githubId } });

    // If the user doesn't exist, throw an error
    if (!user) throw new Error("User not found. Please sign up with GitHub.");

    // Generate a JWT token for the user
    const token = jwt.sign({ userId: user.userId }, process.env.JWT_SECRET!, { expiresIn: "1d" });

    // Return the token and user details
    return { token, name: user.name, email: user.email };
  }

  // Signup Mutation
  @Mutation(() => User)
  async signupWithGitHub(
    @Arg("name") name: string,
    @Arg("email") email: string,
    @Arg("githubId") githubId: string
  ): Promise<User> {
    // Check if a user with the same GitHub ID already exists
    const existingUser = await dataSource.getRepository(User).findOne({ where: { githubId } });

    // If the user already exists, throw an error
    if (existingUser) throw new Error("User already exists with this GitHub account");

    // Create a new user
    const user = dataSource.getRepository(User).create({ name, email, githubId });

    // Save the user to the database
    return await dataSource.getRepository(User).save(user);
  }

  // Query to fetch all users
  @Query(() => [User])
  async users(): Promise<User[]> {
    return await dataSource.getRepository(User).find();
  }
}