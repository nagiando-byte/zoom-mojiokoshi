import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  ArrowLeft, 
  Plus, 
  Pencil, 
  Trash2, 
  FileText,
  Loader2,
  Star
} from "lucide-react";
import { Link } from "wouter";
import { useState } from "react";
import { toast } from "sonner";

type PromptType = 'interview_first' | 'interview_second' | 'regular_meeting' | 'custom';

interface PromptFormData {
  name: string;
  type: PromptType;
  systemPrompt: string;
  userPromptTemplate: string;
  isDefault: boolean;
}

const defaultFormData: PromptFormData = {
  name: '',
  type: 'custom',
  systemPrompt: '',
  userPromptTemplate: '',
  isDefault: false,
};

export default function Prompts() {
  const { data: prompts, isLoading, refetch } = trpc.prompts.list.useQuery();
  const createMutation = trpc.prompts.create.useMutation({
    onSuccess: () => {
      refetch();
      setIsCreateOpen(false);
      setFormData(defaultFormData);
      toast.success('プロンプトを作成しました');
    },
  });
  const updateMutation = trpc.prompts.update.useMutation({
    onSuccess: () => {
      refetch();
      setIsEditOpen(false);
      setEditingPrompt(null);
      toast.success('プロンプトを更新しました');
    },
  });
  const deleteMutation = trpc.prompts.delete.useMutation({
    onSuccess: () => {
      refetch();
      toast.success('プロンプトを削除しました');
    },
  });

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingPrompt, setEditingPrompt] = useState<number | null>(null);
  const [formData, setFormData] = useState<PromptFormData>(defaultFormData);

  const handleCreate = async () => {
    if (!formData.name || !formData.systemPrompt || !formData.userPromptTemplate) {
      toast.error('必須項目を入力してください');
      return;
    }
    await createMutation.mutateAsync(formData);
  };

  const handleUpdate = async () => {
    if (!editingPrompt) return;
    await updateMutation.mutateAsync({
      id: editingPrompt,
      name: formData.name,
      systemPrompt: formData.systemPrompt,
      userPromptTemplate: formData.userPromptTemplate,
      isDefault: formData.isDefault,
    });
  };

  const handleDelete = async (id: number) => {
    if (confirm('このプロンプトを削除しますか？')) {
      await deleteMutation.mutateAsync({ id });
    }
  };

  const openEditDialog = (prompt: NonNullable<typeof prompts>[0]) => {
    setEditingPrompt(prompt.id);
    setFormData({
      name: prompt.name,
      type: prompt.type as PromptType,
      systemPrompt: prompt.systemPrompt,
      userPromptTemplate: prompt.userPromptTemplate,
      isDefault: prompt.isDefault,
    });
    setIsEditOpen(true);
  };

  const getTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      interview_first: '一次面接',
      interview_second: '二次面接',
      regular_meeting: '通常会議',
      custom: 'カスタム',
    };
    return labels[type] || type;
  };

  const getTypeBadgeVariant = (type: string): 'default' | 'secondary' | 'outline' => {
    if (type.startsWith('interview')) return 'default';
    if (type === 'regular_meeting') return 'secondary';
    return 'outline';
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900 p-8">
        <div className="max-w-4xl mx-auto">
          <Skeleton className="h-10 w-48 mb-8" />
          <div className="grid gap-4">
            {[1, 2, 3].map((i) => (
              <Card key={i}>
                <CardHeader>
                  <Skeleton className="h-6 w-48" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-20 w-full" />
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      <div className="max-w-4xl mx-auto p-4 md:p-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Link href="/">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl font-bold">プロンプト管理</h1>
              <p className="text-muted-foreground text-sm">
                議事録生成用のプロンプトテンプレートを管理
              </p>
            </div>
          </div>
          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                新規作成
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>新しいプロンプトを作成</DialogTitle>
                <DialogDescription>
                  議事録生成に使用するプロンプトテンプレートを作成します
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">名前 *</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="プロンプト名"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="type">タイプ *</Label>
                    <Select
                      value={formData.type}
                      onValueChange={(v) => setFormData({ ...formData, type: v as PromptType })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="interview_first">一次面接</SelectItem>
                        <SelectItem value="interview_second">二次面接</SelectItem>
                        <SelectItem value="regular_meeting">通常会議</SelectItem>
                        <SelectItem value="custom">カスタム</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="system">システムプロンプト *</Label>
                  <Textarea
                    id="system"
                    value={formData.systemPrompt}
                    onChange={(e) => setFormData({ ...formData, systemPrompt: e.target.value })}
                    placeholder="AIに与える役割やルールを記述..."
                    rows={6}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="user">ユーザープロンプトテンプレート *</Label>
                  <Textarea
                    id="user"
                    value={formData.userPromptTemplate}
                    onChange={(e) => setFormData({ ...formData, userPromptTemplate: e.target.value })}
                    placeholder="{{transcript}} を使って文字起こしを挿入..."
                    rows={6}
                  />
                  <p className="text-xs text-muted-foreground">
                    {"{{transcript}}"} で文字起こしテキストが挿入されます
                  </p>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
                  キャンセル
                </Button>
                <Button onClick={handleCreate} disabled={createMutation.isPending}>
                  {createMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  作成
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* Prompts List */}
        {prompts && prompts.length > 0 ? (
          <div className="grid gap-4">
            {prompts.map((prompt) => (
              <Card key={prompt.id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                        <FileText className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <CardTitle className="flex items-center gap-2">
                          {prompt.name}
                          {prompt.isDefault && (
                            <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                          )}
                        </CardTitle>
                        <CardDescription className="flex items-center gap-2 mt-1">
                          <Badge variant={getTypeBadgeVariant(prompt.type)}>
                            {getTypeLabel(prompt.type)}
                          </Badge>
                        </CardDescription>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => openEditDialog(prompt)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(prompt.id)}
                        disabled={deleteMutation.isPending}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div>
                      <p className="text-xs font-medium text-muted-foreground mb-1">システムプロンプト</p>
                      <p className="text-sm line-clamp-2 bg-muted/50 p-2 rounded">
                        {prompt.systemPrompt}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-muted-foreground mb-1">ユーザープロンプト</p>
                      <p className="text-sm line-clamp-2 bg-muted/50 p-2 rounded">
                        {prompt.userPromptTemplate}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="py-12 text-center">
              <FileText className="mx-auto h-12 w-12 text-muted-foreground mb-4 opacity-50" />
              <p className="text-muted-foreground">プロンプトがありません</p>
              <p className="text-sm text-muted-foreground mt-1">
                「新規作成」ボタンからプロンプトを追加してください
              </p>
            </CardContent>
          </Card>
        )}

        {/* Edit Dialog */}
        <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>プロンプトを編集</DialogTitle>
              <DialogDescription>
                プロンプトテンプレートの内容を変更します
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="edit-name">名前</Label>
                <Input
                  id="edit-name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-system">システムプロンプト</Label>
                <Textarea
                  id="edit-system"
                  value={formData.systemPrompt}
                  onChange={(e) => setFormData({ ...formData, systemPrompt: e.target.value })}
                  rows={6}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-user">ユーザープロンプトテンプレート</Label>
                <Textarea
                  id="edit-user"
                  value={formData.userPromptTemplate}
                  onChange={(e) => setFormData({ ...formData, userPromptTemplate: e.target.value })}
                  rows={6}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsEditOpen(false)}>
                キャンセル
              </Button>
              <Button onClick={handleUpdate} disabled={updateMutation.isPending}>
                {updateMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                保存
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}

