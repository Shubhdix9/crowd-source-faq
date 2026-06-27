import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IChatLog extends Document {
  userMessage: string;
  botReply: string;
  feedback?: number; // 1 = helpful, -1 = unhelpful, 0 = neutral/unrated
  userId?: Types.ObjectId; // Optional, if logged in
  createdAt: Date;
  updatedAt: Date;
}

const chatLogSchema = new Schema<IChatLog>(
  {
    userMessage: {
      type: String,
      required: true,
    },
    botReply: {
      type: String,
      required: true,
    },
    feedback: {
      type: Number,
      enum: [-1, 0, 1],
      default: 0,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: false,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for analytics and sorting
chatLogSchema.index({ createdAt: -1 });
chatLogSchema.index({ feedback: 1 });

const ChatLog = mongoose.models.ChatLog || mongoose.model<IChatLog>('ChatLog', chatLogSchema);

export default ChatLog;
