import { Request, Response } from 'express';
import crypto from 'crypto';
import { eq } from 'drizzle-orm';
import { verifyZoomWebhookSignature, RecordingCompletedPayload } from './_core/zoomWebhook';
import { findTranscriptFile, downloadTranscript } from './zoomService';
import { getDb } from './db';
import { meetings, transcripts, InsertMeeting, InsertTranscript } from '../drizzle/schema';

/**
 * Handle Zoom webhook events
 */
export async function handleZoomWebhook(req: Request, res: Response) {
  try {
    // Get headers
    const signature = req.headers['x-zm-signature'] as string;
    const timestamp = req.headers['x-zm-request-timestamp'] as string;

    // Verify signature
    const rawBody = JSON.stringify(req.body);
    if (signature && timestamp) {
      const isValid = verifyZoomWebhookSignature(rawBody, signature, timestamp);
      if (!isValid) {
        console.error('[Zoom Webhook] Invalid signature');
        return res.status(401).json({ error: 'Invalid signature' });
      }
    }

    const payload = req.body;

    // Handle endpoint URL validation
    if (payload.event === 'endpoint.url_validation') {
      const plainToken = payload.payload.plainToken;
      const encryptedToken = crypto
        .createHmac('sha256', process.env.ZOOM_WEBHOOK_SECRET_TOKEN || '')
        .update(plainToken)
        .digest('hex');

      return res.status(200).json({
        plainToken,
        encryptedToken,
      });
    }

    // Handle recording.completed event
    if (payload.event === 'recording.completed') {
      await handleRecordingCompleted(payload as RecordingCompletedPayload);
    }

    // Acknowledge receipt
    res.status(200).json({ success: true });
  } catch (error: any) {
    console.error('[Zoom Webhook] Error handling webhook:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * Handle recording.completed event
 */
async function handleRecordingCompleted(payload: RecordingCompletedPayload) {
  const { object, account_id } = payload.payload;
  const downloadToken = payload.download_token;

  console.log('[Zoom Webhook] Recording completed:', {
    meetingId: object.id,
    topic: object.topic,
    recordingCount: object.recording_count,
  });

  const db = await getDb();
  if (!db) {
    console.error('[Zoom Webhook] Database not available');
    return;
  }

  try {
    // Save meeting information
    const meetingData: InsertMeeting = {
      zoomMeetingId: object.id.toString(),
      zoomRecordingId: object.uuid,
      zoomUuid: object.uuid,
      topic: object.topic,
      hostId: object.host_id,
      startTime: new Date(object.start_time),
      duration: object.duration,
      shareUrl: object.share_url,
      downloadToken: downloadToken || null,
      status: 'pending',
    };

    const [insertedMeeting] = await db.insert(meetings).values(meetingData);
    const meetingId = insertedMeeting.insertId;

    console.log('[Zoom Webhook] Meeting saved to database:', meetingId);

    // Find and download transcript
    const transcriptFile = findTranscriptFile(object.recording_files);

    if (transcriptFile && downloadToken) {
      console.log('[Zoom Webhook] Downloading transcript...');

      try {
        const { fullText, vttContent } = await downloadTranscript(
          transcriptFile.download_url,
          downloadToken
        );

        // Save transcript
        const transcriptData: InsertTranscript = {
          meetingId: Number(meetingId),
          fullText,
          vttContent,
          language: 'en', // Zoom doesn't provide language in webhook, default to 'en'
        };

        await db.insert(transcripts).values(transcriptData);

        console.log('[Zoom Webhook] Transcript saved successfully');

        // Update meeting status to processing (ready for AI processing)
        await db
          .update(meetings)
          .set({ status: 'processing' })
          .where(eq(meetings.id, Number(meetingId)));

        // Trigger AI processing
        const { processTranscriptWithAI } = await import('./aiService');
        await processTranscriptWithAI(Number(meetingId));
      } catch (error) {
        console.error('[Zoom Webhook] Failed to download transcript:', error);
        await db
          .update(meetings)
          .set({
            status: 'failed',
            processingError: 'Failed to download transcript',
          })
          .where(eq(meetings.id, Number(meetingId)));
      }
    } else {
      console.warn('[Zoom Webhook] No transcript file found or download token missing');
      await db
        .update(meetings)
        .set({
          status: 'failed',
          processingError: 'No transcript available',
        })
        .where(eq(meetings.id, Number(meetingId)));
    }
  } catch (error: any) {
    console.error('[Zoom Webhook] Error processing recording:', error);
  }
}
