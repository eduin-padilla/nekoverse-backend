import { Schema, model, type InferSchemaType } from "mongoose";

const userSchema = new Schema(
  {
    username: { type: String, required: true, trim: true, minlength: 3, maxlength: 30 },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true, select: false },
    role: { type: String, enum: ["user", "admin"], default: "user", required: true },
    isActive: { type: Boolean, default: true, required: true },
    avatarUrl: { type: String, default: "" },
  },
  { timestamps: true, versionKey: false }
);

userSchema.index({ username: 1 }, { unique: true });

export type User = InferSchemaType<typeof userSchema>;
export const UserModel = model("User", userSchema);