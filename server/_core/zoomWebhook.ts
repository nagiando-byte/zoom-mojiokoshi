import crypto from 'crypto';

/**
 * Verify Zoom webhook signature
 * @param payload - Raw request body as string
 * @param signature - x-zm-signature header value
 * @param timestamp - x-zm-request-timestamp header value
 * @returns true if signature is valid
 */
export function verifyZoomWebhookSignature(
  payload: string,
  signature: string,
  timestamp: string
): boolean {
  const secretToken = process.env.ZOOM_WEBHOOK_SECRET_TOKEN;

  if (!secretToken) {
    console.warn('[Zoom Webhook] ZOOM_WEBHOOK_SECRET_TOKEN not configured, skipping signature verification');
    return true; // Allow in development
  }

  try {
    // Construct the message: v0:{timestamp}:{payload}
    const message = `v0:${timestamp}:${payload}`;

    // Calculate HMAC SHA256
    const hash = crypto
      .createHmac('sha256', secretToken)
      .update(message)
      .digest('hex');

    const expectedSignature = `v0=${hash}`;

    // Compare signatures
    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature)
    );
  } catch (error) {
    console.error('[Zoom Webhook] Signature verification failed:', error);
    return false;
  }
}

/**
 * Zoom Webhook Event Types
 */
export type ZoomWebhookEventType =
  | 'recording.completed'
  | 'recording.transcript_completed'
  | 'meeting.ended'
  | string;

/**
 * Zoom Webhook Payload Structure
 */
export interface ZoomWebhookPayload {
  event: ZoomWebhookEventType;
  event_ts: number;
  payload: {
    account_id: string;
    object: any;
  };
}

/**
 * Recording Completed Event Payload
 */
export interface RecordingCompletedPayload {
  event: 'recording.completed';
  event_ts: number;
  payload: {
    account_id: string;
    object: {
      uuid: string;
      id: number;
      host_id: string;
      topic: string;
      start_time: string;
      duration: number;
      share_url: string;
      total_size: number;
      recording_count: number;
      recording_files: Array<{
        id: string;
        meeting_id: string;
        recording_start: string;
        recording_end: string;
        file_type: string;
        file_size: number;
        play_url: string;
        download_url: string;
        status: string;
        recording_type: string;
      }>;
    };
  };
  download_token?: string;
}
