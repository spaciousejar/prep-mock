"use server";

import { generateObject } from "ai";
import { google } from "@ai-sdk/google";

import { db } from "@/firebase/admin";
import { feedbackSchema } from "@/constants";

export async function createFeedback(params: CreateFeedbackParams) {
  const { interviewId, userId, transcript, feedbackId } = params;

  try {
    const formattedTranscript = transcript
      .map(
        (sentence: { role: string; content: string }) =>
          `- ${sentence.role}: ${sentence.content}\n`
      )
      .join("");

    const { object } = await generateObject({
      model: google("gemini-2.0-flash-001", {
        structuredOutputs: false,
      }),
      schema: feedbackSchema,
      prompt: `
        You are an AI interviewer analyzing a mock interview. Your task is to evaluate the candidate based on structured categories. Be thorough and detailed in your analysis. Don't be lenient with the candidate. If there are mistakes or areas for improvement, point them out.
        Transcript:
        ${formattedTranscript}

        Please score the candidate from 0 to 100 in the following areas. Do not add categories other than the ones provided:
        - **Communication Skills**: Clarity, articulation, structured responses.
        - **Technical Knowledge**: Understanding of key concepts for the role.
        - **Problem-Solving**: Ability to analyze problems and propose solutions.
        - **Cultural & Role Fit**: Alignment with company values and job role.
        - **Confidence & Clarity**: Confidence in responses, engagement, and clarity.
        `,
      system:
        "You are a professional interviewer analyzing a mock interview. Your task is to evaluate the candidate based on structured categories",
    });

    const feedback = {
      interviewId: interviewId,
      userId: userId,
      totalScore: object.totalScore,
      categoryScores: object.categoryScores,
      strengths: object.strengths,
      areasForImprovement: object.areasForImprovement,
      finalAssessment: object.finalAssessment,
      createdAt: new Date().toISOString(),
    };

    let feedbackRef;

    if (feedbackId) {
      feedbackRef = db.collection("feedback").doc(feedbackId);
    } else {
      feedbackRef = db.collection("feedback").doc();
    }

    await feedbackRef.set(feedback);

    return { success: true, feedbackId: feedbackRef.id };
  } catch (error) {
    console.error("Error saving feedback:", error);
    return { success: false };
  }
}

export async function getInterviewById(id: string): Promise<Interview | null> {
  const interview = await db.collection("interviews").doc(id).get();

  return interview.data() as Interview | null;
}

export async function getFeedbackByInterviewId(
  params: GetFeedbackByInterviewIdParams
): Promise<Feedback | null> {
  const { interviewId, userId } = params;

  const querySnapshot = await db
    .collection("feedback")
    .where("interviewId", "==", interviewId)
    .where("userId", "==", userId)
    .limit(1)
    .get();

  if (querySnapshot.empty) return null;

  const feedbackDoc = querySnapshot.docs[0];
  return { id: feedbackDoc.id, ...feedbackDoc.data() } as Feedback;
}

export async function getLatestInterviews(
  params: GetLatestInterviewsParams
): Promise<Interview[] | null> {
  const { userId, limit = 20 } = params;

  // Avoid composite index requirement by fetching finalized items,
  // filtering out the current user's interviews, then sorting/limiting in memory.
  const snapshot = await db
    .collection("interviews")
    .where("finalized", "==", true)
    .get();

  const toTimestampMs = (value: unknown): number => {
    // Support Firestore Timestamp, Date, or ISO string
    // @ts-expect-error - runtime shape checks
    if (value && typeof value === "object" && typeof value.toDate === "function") {
      // Firestore Timestamp
      // @ts-expect-error - timestamp has toDate
      return value.toDate().getTime();
    }
    if (value instanceof Date) return value.getTime();
    if (typeof value === "string") {
      const ms = Date.parse(value);
      return Number.isNaN(ms) ? 0 : ms;
    }
    return 0;
  };

  const interviews = snapshot.docs
    .map((doc) => ({ id: doc.id, ...doc.data() }))
    .filter((i: any) => i.userId !== userId)
    .sort((a: any, b: any) => toTimestampMs(b.createdAt) - toTimestampMs(a.createdAt))
    .slice(0, limit) as Interview[];

  return interviews;
}

export async function getInterviewsByUserId(
  userId: string
): Promise<Interview[] | null> {
  // Avoid composite index requirement by removing orderBy and sorting in memory.
  const snapshot = await db
    .collection("interviews")
    .where("userId", "==", userId)
    .get();

  const toTimestampMs = (value: unknown): number => {
    // @ts-expect-error - runtime shape checks
    if (value && typeof value === "object" && typeof value.toDate === "function") {
      // @ts-expect-error - timestamp has toDate
      return value.toDate().getTime();
    }
    if (value instanceof Date) return value.getTime();
    if (typeof value === "string") {
      const ms = Date.parse(value);
      return Number.isNaN(ms) ? 0 : ms;
    }
    return 0;
  };

  const interviews = snapshot.docs
    .map((doc) => ({ id: doc.id, ...doc.data() }))
    .sort((a: any, b: any) => toTimestampMs(b.createdAt) - toTimestampMs(a.createdAt)) as Interview[];

  return interviews;
}
