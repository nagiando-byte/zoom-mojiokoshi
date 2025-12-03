import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Video, 
  CheckCircle2, 
  Clock, 
  AlertTriangle,
  ArrowRight,
  Calendar,
  Users,
  Briefcase,
  MessageSquare,
  Settings,
  FileText
} from "lucide-react";
import { Link } from "wouter";
import { format } from "date-fns";
import { ja } from "date-fns/locale";
import { getLoginUrl } from "@/const";

export default function Home() {
  const { user, loading: authLoading, isAuthenticated } = useAuth();
  const { data: stats, isLoading: statsLoading } = trpc.meetings.stats.useQuery(
    undefined,
    { enabled: isAuthenticated }
  );

  // Login screen
  if (!authLoading && !isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 via-white to-cyan-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
        <Card className="w-full max-w-md mx-4 shadow-xl border-0 bg-white/80 backdrop-blur">
          <CardHeader className="text-center pb-2">
            <div className="mx-auto mb-4 h-20 w-20 rounded-2xl bg-gradient-to-br from-indigo-500 to-cyan-500 flex items-center justify-center shadow-lg">
              <Video className="h-10 w-10 text-white" />
            </div>
            <CardTitle className="text-3xl font-bold bg-gradient-to-r from-indigo-600 to-cyan-600 bg-clip-text text-transparent">
              Zoom 文字起こし
            </CardTitle>
            <CardDescription className="text-base mt-2">
              会議の文字起こしと議事録を自動生成
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            <Button asChild className="w-full h-12 text-lg bg-gradient-to-r from-indigo-500 to-cyan-500 hover:from-indigo-600 hover:to-cyan-600" size="lg">
              <a href={getLoginUrl()}>ログインして始める</a>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Loading
  if (authLoading || statsLoading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900 p-8">
        <div className="max-w-6xl mx-auto">
          <Skeleton className="h-10 w-64 mb-8" />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {[1, 2, 3, 4].map((i) => (
              <Card key={i}>
                <CardHeader className="pb-2"><Skeleton className="h-4 w-20" /></CardHeader>
                <CardContent><Skeleton className="h-8 w-16" /></CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const getMeetingTypeIcon = (type: string) => {
    const icons: Record<string, React.ReactNode> = {
      interview: <Users className="h-4 w-4" />,
      internal_meeting: <MessageSquare className="h-4 w-4" />,
      client_meeting: <Briefcase className="h-4 w-4" />,
    };
    return icons[type] || <Video className="h-4 w-4" />;
  };

  const getMeetingTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      unknown: '未分類',
      interview: '面接',
      internal_meeting: '社内会議',
      client_meeting: '取引先',
      one_on_one: '1on1',
      training: '研修',
      presentation: 'プレゼン',
      other: 'その他',
    };
    return labels[type] || type;
  };

  const getStatusBadge = (status: string) => {
    const config: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
      pending: { label: '処理待ち', variant: 'outline' },
      processing: { label: '処理中', variant: 'secondary' },
      completed: { label: '完了', variant: 'default' },
      failed: { label: '失敗', variant: 'destructive' },
    };
    const c = config[status] || { label: status, variant: 'outline' };
    return <Badge variant={c.variant}>{c.label}</Badge>;
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      {/* Header */}
      <header className="border-b bg-white dark:bg-slate-800 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-indigo-500 to-cyan-500 flex items-center justify-center">
              <Video className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="font-bold text-lg">Zoom 文字起こし</h1>
              <p className="text-xs text-muted-foreground">ダッシュボード</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground hidden sm:block">
              {user?.name || user?.email}
            </span>
            <Link href="/prompts">
              <Button variant="ghost" size="sm">
                <Settings className="h-4 w-4 mr-2" />
                プロンプト
              </Button>
            </Link>
            <Link href="/meetings">
              <Button variant="outline" size="sm">
                会議一覧
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto p-4 md:p-8">
        {/* Welcome */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold">
            おかえりなさい{user?.name ? `、${user.name}さん` : ''}
          </h2>
          <p className="text-muted-foreground mt-1">会議の処理状況を確認しましょう</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <Card className="border-0 shadow-md bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-800 dark:to-slate-900">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">総会議数</CardTitle>
              <Video className="h-5 w-5 text-indigo-500" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stats?.total || 0}</div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-md bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">処理完了</CardTitle>
              <CheckCircle2 className="h-5 w-5 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-green-600">{stats?.byStatus.completed || 0}</div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-md bg-gradient-to-br from-amber-50 to-yellow-50 dark:from-amber-900/20 dark:to-yellow-900/20">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">処理待ち</CardTitle>
              <Clock className="h-5 w-5 text-amber-500" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-amber-600">
                {(stats?.byStatus.pending || 0) + (stats?.byStatus.processing || 0)}
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-md bg-gradient-to-br from-red-50 to-rose-50 dark:from-red-900/20 dark:to-rose-900/20">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">失敗</CardTitle>
              <AlertTriangle className="h-5 w-5 text-red-500" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-red-600">{stats?.byStatus.failed || 0}</div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Recent Meetings */}
          <Card className="lg:col-span-2 border-0 shadow-md">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-indigo-500" />
                最近の会議
              </CardTitle>
              <CardDescription>直近の会議5件</CardDescription>
            </CardHeader>
            <CardContent>
              {stats?.recentMeetings && stats.recentMeetings.length > 0 ? (
                <div className="space-y-3">
                  {stats.recentMeetings.map((meeting) => (
                    <Link key={meeting.id} href={`/meetings/${meeting.id}`}>
                      <div className="flex items-center justify-between p-3 rounded-xl border bg-card hover:bg-accent/50 transition-all cursor-pointer hover:shadow-sm">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center">
                            {getMeetingTypeIcon(meeting.meetingType || 'unknown')}
                          </div>
                          <div>
                            <p className="font-medium line-clamp-1">{meeting.topic || '無題の会議'}</p>
                            <p className="text-sm text-muted-foreground flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {meeting.startTime
                                ? format(new Date(meeting.startTime), 'MM/dd HH:mm', { locale: ja })
                                : '日時不明'}
                            </p>
                          </div>
                        </div>
                        {getStatusBadge(meeting.status)}
                      </div>
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <Video className="mx-auto h-16 w-16 mb-4 opacity-30" />
                  <p className="font-medium">まだ会議がありません</p>
                  <p className="text-sm mt-1">Zoomで録画すると自動的に追加されます</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Meeting Types */}
          <Card className="border-0 shadow-md">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5 text-cyan-500" />
                会議種類別
              </CardTitle>
              <CardDescription>種類ごとの会議数</CardDescription>
            </CardHeader>
            <CardContent>
              {stats?.byType && Object.keys(stats.byType).length > 0 ? (
                <div className="space-y-3">
                  {Object.entries(stats.byType)
                    .sort(([, a], [, b]) => b - a)
                    .map(([type, count]) => (
                      <div key={type} className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50 transition-colors">
                        <div className="flex items-center gap-2">
                          {getMeetingTypeIcon(type)}
                          <span className="text-sm">{getMeetingTypeLabel(type)}</span>
                        </div>
                        <Badge variant="secondary" className="font-mono">{count}</Badge>
                      </div>
                    ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <p className="text-sm">データがありません</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
