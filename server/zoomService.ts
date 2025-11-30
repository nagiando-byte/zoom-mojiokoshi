import axios from 'axios';
import { makeZoomRequest } from './_core/zoomAuth';

/**
 * Zoom Recording File
 */
export interface ZoomRecordingFile {
  id: string;
  meeting_id: string;
  recording_start: string;
  recording_end: string;
  file_type: string; // "MP4", "M4A", "TIMELINE", "TRANSCRIPT", "CHAT", "CC", "CSV"
  file_size: number;
  play_url: string;
  download_url: string;
  status: string;
  recording_type: string;
}

/**
 * Zoom Meeting Recording
 */
export interface ZoomMeetingRecording {
  uuid: string;
  id: number;
  account_id: string;
  host_id: string;
  topic: string;
  start_time: string;
  duration: number;
  total_size: number;
  recording_count: number;
  share_url: string;
  recording_files: ZoomRecordingFile[];
}

/**
 * Get meeting recordings by meeting ID
 */
export async function getMeetingRecordings(meetingId: string): Promise<ZoomMeetingRecording> {
  return await makeZoomRequest<ZoomMeetingRecording>(
    'GET',
    `/meetings/${meetingId}/recordings`
  );
}

/**
 * Download recording file using download_url and download_token
 * @param downloadUrl - The download URL from webhook or API
 * @param downloadToken - The download token (valid for 24 hours after webhook)
 * @returns File content as Buffer
 */
export async function downloadRecordingFile(
  downloadUrl: string,
  downloadToken: string
): Promise<Buffer> {
  try {
    const response = await axios.get(downloadUrl, {
      headers: {
        'Authorization': `Bearer ${downloadToken}`,
      },
      responseType: 'arraybuffer',
    });

    return Buffer.from(response.data);
  } catch (error: any) {
    console.error('[Zoom Service] Failed to download recording file:', error.message);
    throw new Error('Failed to download recording file from Zoom');
  }
}

/**
 * Extract transcript text from VTT format
 * @param vttContent - VTT format transcript content
 * @returns Plain text transcript
 */
export function extractTextFromVTT(vttContent: string): string {
  // Remove WEBVTT header
  let text = vttContent.replace(/^WEBVTT\n\n/, '');
  
  // Remove timestamp lines (e.g., "00:00:00.000 --> 00:00:05.000")
  text = text.replace(/\d{2}:\d{2}:\d{2}\.\d{3} --> \d{2}:\d{2}:\d{2}\.\d{3}\n/g, '');
  
  // Remove cue identifiers (numbers at the start of lines)
  text = text.replace(/^\d+\n/gm, '');
  
  // Remove empty lines and trim
  text = text
    .split('\n')
    .filter(line => line.trim().length > 0)
    .join('\n')
    .trim();
  
  return text;
}

/**
 * Find transcript file from recording files
 */
export function findTranscriptFile(recordingFiles: ZoomRecordingFile[]): ZoomRecordingFile | null {
  return recordingFiles.find(file => file.file_type === 'TRANSCRIPT') || null;
}

/**
 * Download and process transcript
 */
export async function downloadTranscript(
  downloadUrl: string,
  downloadToken: string
): Promise<{ fullText: string; vttContent: string }> {
  const buffer = await downloadRecordingFile(downloadUrl, downloadToken);
  const vttContent = buffer.toString('utf-8');
  const fullText = extractTextFromVTT(vttContent);

  return {
    fullText,
    vttContent,
  };
}
