import mongoose, { Schema, Model } from 'mongoose';
import bcrypt from 'bcryptjs';
import { IUser } from '../types';
import { ALL_USER_ROLES } from '../constants';

const userSchema: Schema<IUser> = new Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    role: { type: String, enum: ALL_USER_ROLES, default: 'user' },
  },
  {
    timestamps: true,
    versionKey: false,
    id: false,
    toJSON: {
      virtuals: true,
      transform: function (doc, ret) {
        delete ret.password;
        return ret;
      },
    },
  }
);

userSchema.methods.matchPassword = function (
  this: IUser,
  enteredPassword: string
): Promise<boolean> {
  return bcrypt.compare(enteredPassword, this.password);
};

userSchema.pre<IUser>('save', async function (next) {
  if (!this.isModified('password')) return next();

  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

const User: Model<IUser> = mongoose.model<IUser>('User', userSchema);
export default User;
