import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  ArrowLeft, 
  Calendar, 
  Clock, 
  User, 
  AlertCircle, 
  RefreshCw,
  FileText,
  CheckSquare,
  MessageSquare,
  Loader2
} from "lucide-react";
import { Link, useParams } from "wouter";
import { format } from "date-fns";
import { ja } from "date-fns/locale";
import { useState } from "react";

export default function MeetingDetail() {
  const params = useParams<{ id: string }>();
  const meetingId = parseInt(params.id || "0", 10);
  
  const { data, isLoading, refetch } = trpc.meetings.getById.useQuery(
    { id: meetingId },
    { enabled: meetingId > 0 }
  );
  
  const reprocessMutation = trpc.meetings.reprocess.useMutation({
    onSuccess: () => {
      refetch();
    },
  });

  const [isReprocessing, setIsReprocessing] = useState(false);

  const handleReprocess = async () => {
    setIsReprocessing(true);
    try {
      await reprocessMutation.mutateAsync({ meetingId });
    } finally {
      setIsReprocessing(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900 p-8">
        <div className="max-w-5xl mx-auto">
          <div className="flex items-center gap-4 mb-8">
            <Skeleton className="h-10 w-10 rounded-full" />
            <Skeleton className="h-8 w-64" />
          </div>
          <Card>
            <CardHeader>
              <Skeleton className="h-6 w-3/4" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-32 w-full" />
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (!data || !data.meeting) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900 p-8">
        <div className="max-w-5xl mx-auto">
          <Link href="/meetings">
            <Button variant="ghost" className="mb-8">
              <ArrowLeft className="mr-2 h-4 w-4" />
              戻る
            </Button>
          </Link>
          <Card>
            <CardContent className="py-12 text-center">
              <AlertCircle className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">会議が見つかりませんでした</p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const { meeting, transcript, minutes, actionItems } = data;

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
    const typeLabels: Record<string, string> = {
      internal_meeting: '社内会議',
      client_meeting: '取引先打ち合わせ',
      one_on_one: '1on1',
      training: '研修・トレーニング',
      presentation: 'プレゼン・説明会',
      other: 'その他',
    };
    return typeLabels[type || 'unknown'] || '通常会議';
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

  const getPriorityBadge = (priority: string) => {
    const priorityConfig: Record<string, { label: string; className: string }> = {
      high: { label: '高', className: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' },
      medium: { label: '中', className: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' },
      low: { label: '低', className: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' },
    };
    const config = priorityConfig[priority] || { label: priority, className: '' };
    return <Badge className={config.className}>{config.label}</Badge>;
  };

  const parseJsonSafe = (jsonString: string | null): string[] => {
    if (!jsonString) return [];
    try {
      const parsed = JSON.parse(jsonString);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      <div className="max-w-5xl mx-auto p-4 md:p-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Link href="/meetings">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl font-bold">{meeting.topic || '無題の会議'}</h1>
              <div className="flex items-center gap-4 text-muted-foreground mt-1">
                {meeting.startTime && (
                  <span className="flex items-center gap-1 text-sm">
                    <Calendar className="h-4 w-4" />
                    {format(new Date(meeting.startTime), 'yyyy年MM月dd日 HH:mm', { locale: ja })}
                  </span>
                )}
                {meeting.duration && (
                  <span className="flex items-center gap-1 text-sm">
                    <Clock className="h-4 w-4" />
                    {meeting.duration}分
                  </span>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {getStatusBadge(meeting.status)}
            {meeting.meetingType && meeting.meetingType !== 'unknown' && (
              <Badge variant="secondary">
                {getMeetingTypeLabel(meeting.meetingType, meeting.interviewStage)}
              </Badge>
            )}
            <Button 
              variant="outline" 
              onClick={handleReprocess}
              disabled={isReprocessing || meeting.status === 'processing'}
            >
              {isReprocessing ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="mr-2 h-4 w-4" />
              )}
              再処理
            </Button>
          </div>
        </div>

        {/* Error message */}
        {meeting.processingError && (
          <Card className="mb-6 border-destructive">
            <CardContent className="py-4">
              <div className="flex items-center gap-2 text-destructive">
                <AlertCircle className="h-5 w-5" />
                <span className="font-medium">エラー:</span>
                <span>{meeting.processingError}</span>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Main content tabs */}
        <Tabs defaultValue="minutes" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="minutes" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              議事録
            </TabsTrigger>
            <TabsTrigger value="transcript" className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4" />
              文字起こし
            </TabsTrigger>
            <TabsTrigger value="actions" className="flex items-center gap-2">
              <CheckSquare className="h-4 w-4" />
              アクション
              {actionItems && actionItems.length > 0 && (
                <Badge variant="secondary" className="ml-1">{actionItems.length}</Badge>
              )}
            </TabsTrigger>
          </TabsList>

          {/* Minutes Tab */}
          <TabsContent value="minutes">
            <Card>
              <CardHeader>
                <CardTitle>議事録</CardTitle>
                <CardDescription>AIによって生成された会議の要約</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {minutes ? (
                  <>
                    {minutes.summary && (
                      <div>
                        <h3 className="font-semibold mb-2">サマリー</h3>
                        <p className="text-muted-foreground whitespace-pre-wrap">{minutes.summary}</p>
                      </div>
                    )}
                    {minutes.keyPoints && (
                      <>
                        <Separator />
                        <div>
                          <h3 className="font-semibold mb-3">主要ポイント</h3>
                          <ul className="space-y-2">
                            {parseJsonSafe(minutes.keyPoints).map((point, i) => (
                              <li key={i} className="flex items-start gap-2">
                                <span className="text-primary font-medium">{i + 1}.</span>
                                <span className="text-muted-foreground">{point}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      </>
                    )}
                    {minutes.decisions && (
                      <>
                        <Separator />
                        <div>
                          <h3 className="font-semibold mb-3">決定事項</h3>
                          <ul className="space-y-2">
                            {parseJsonSafe(minutes.decisions).map((d, i) => (
                              <li key={i} className="flex items-start gap-2">
                                <CheckSquare className="h-4 w-4 text-green-500 mt-0.5" />
                                <span className="text-muted-foreground">{d}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      </>
                    )}
                  </>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <FileText className="mx-auto h-12 w-12 mb-4 opacity-50" />
                    <p>議事録がまだ生成されていません</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Transcript Tab */}
          <TabsContent value="transcript">
            <Card>
              <CardHeader>
                <CardTitle>文字起こし</CardTitle>
                <CardDescription>会議音声から自動生成されたテキスト</CardDescription>
              </CardHeader>
              <CardContent>
                {transcript ? (
                  <ScrollArea className="h-[500px] rounded-md border p-4">
                    <p className="whitespace-pre-wrap text-sm leading-relaxed">
                      {transcript.fullText}
                    </p>
                  </ScrollArea>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <MessageSquare className="mx-auto h-12 w-12 mb-4 opacity-50" />
                    <p>文字起こしがまだありません</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Action Items Tab */}
          <TabsContent value="actions">
            <Card>
              <CardHeader>
                <CardTitle>アクションアイテム</CardTitle>
                <CardDescription>会議で決まったタスク</CardDescription>
              </CardHeader>
              <CardContent>
                {actionItems && actionItems.length > 0 ? (
                  <div className="space-y-4">
                    {actionItems.map((item) => (
                      <div key={item.id} className="flex items-start gap-4 p-4 rounded-lg border">
                        <div className="flex-1">
                          <p className="font-medium">{item.description}</p>
                          <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                            {item.assignee && (
                              <span className="flex items-center gap-1">
                                <User className="h-3 w-3" />
                                {item.assignee}
                              </span>
                            )}
                            {item.dueDate && (
                              <span className="flex items-center gap-1">
                                <Calendar className="h-3 w-3" />
                                {format(new Date(item.dueDate), 'MM/dd')}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {item.priority && getPriorityBadge(item.priority)}
                          {getStatusBadge(item.status)}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <CheckSquare className="mx-auto h-12 w-12 mb-4 opacity-50" />
                    <p>アクションアイテムがありません</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Meeting Info */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="text-lg">会議情報</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">会議ID</span>
                <p className="font-mono">{meeting.zoomMeetingId}</p>
              </div>
              {meeting.hostEmail && (
                <div>
                  <span className="text-muted-foreground">ホスト</span>
                  <p>{meeting.hostEmail}</p>
                </div>
              )}
              <div>
                <span className="text-muted-foreground">作成日時</span>
                <p>{format(new Date(meeting.createdAt), 'yyyy/MM/dd HH:mm')}</p>
              </div>
              <div>
                <span className="text-muted-foreground">更新日時</span>
                <p>{format(new Date(meeting.updatedAt), 'yyyy/MM/dd HH:mm')}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}


