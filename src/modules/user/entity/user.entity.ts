import { Field, ObjectType } from "type-graphql";
import { Column, Entity, PrimaryGeneratedColumn } from "typeorm";

@Entity({ name: "users" })
@ObjectType()
export class User {
  @PrimaryGeneratedColumn("uuid", { name: "u_id" })
  @Field()
  userId!: string;

  @Column()
  @Field()
  name!: string;

  @Column({ unique: true })
  @Field()
  email!: string;

  @Column({ unique: true, nullable: true })
  @Field({ nullable: true })
  githubId?: string; // Store GitHub ID for authentication
}
