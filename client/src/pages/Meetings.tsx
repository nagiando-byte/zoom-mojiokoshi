import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { FileText, Calendar, Clock, User, AlertCircle } from "lucide-react";
import { Link } from "wouter";
import { format } from "date-fns";

export default function Meetings() {
  const { data: meetings, isLoading } = trpc.meetings.list.useQuery();

  if (isLoading) {
    return (
      <div className="container py-8">
        <h1 className="text-3xl font-bold mb-8">会議一覧</h1>
        <div className="grid gap-4">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-6 w-3/4" />
                <Skeleton className="h-4 w-1/2 mt-2" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-4 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  const getMeetingTypeLabel = (type: string | null, stage: string | null) => {
    if (type === 'interview') {
      const stageLabels: Record<string, string> = {
        first: '一次面接',
        second: '二次面接',
        final: '最終面接',
        other: 'その他面接',
      };
      return stageLabels[stage || 'other'] || '面接';
    }
    return '通常会議';
  };

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
      pending: { label: '処理待ち', variant: 'outline' },
      processing: { label: '処理中', variant: 'secondary' },
      completed: { label: '完了', variant: 'default' },
      failed: { label: '失敗', variant: 'destructive' },
    };

    const config = statusConfig[status] || { label: status, variant: 'outline' };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  return (
    <div className="container py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">会議一覧</h1>
      </div>

      {!meetings || meetings.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <FileText className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">会議データがありません</p>
            <p className="text-sm text-muted-foreground mt-2">
              Zoomで録画を行うと、自動的にここに表示されます
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {meetings.map((meeting) => (
            <Link key={meeting.id} href={`/meetings/${meeting.id}`}>
              <Card className="hover:bg-accent/50 transition-colors cursor-pointer">
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <CardTitle className="text-xl mb-2">{meeting.topic || '無題の会議'}</CardTitle>
                      <CardDescription className="flex flex-wrap gap-3">
                        {meeting.startTime && (
                          <span className="flex items-center gap-1">
                            <Calendar className="h-4 w-4" />
                            {format(new Date(meeting.startTime), 'yyyy年MM月dd日')}
                          </span>
                        )}
                        {meeting.duration && (
                          <span className="flex items-center gap-1">
                            <Clock className="h-4 w-4" />
                            {meeting.duration}分
                          </span>
                        )}
                        {meeting.hostId && (
                          <span className="flex items-center gap-1">
                            <User className="h-4 w-4" />
                            {meeting.hostEmail || meeting.hostId}
                          </span>
                        )}
                      </CardDescription>
                    </div>
                    <div className="flex flex-col gap-2 items-end">
                      {getStatusBadge(meeting.status)}
                      {meeting.meetingType && meeting.meetingType !== 'unknown' && (
                        <Badge variant="secondary">
                          {getMeetingTypeLabel(meeting.meetingType, meeting.interviewStage)}
                        </Badge>
                      )}
                    </div>
                  </div>
                </CardHeader>
                {meeting.processingError && (
                  <CardContent>
                    <div className="flex items-center gap-2 text-destructive text-sm">
                      <AlertCircle className="h-4 w-4" />
                      <span>{meeting.processingError}</span>
                    </div>
                  </CardContent>
                )}
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
