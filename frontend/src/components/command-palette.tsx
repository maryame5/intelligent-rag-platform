import { useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { BookOpen, FileText, MessagesSquare, Plus, ShieldCheck, UserPlus } from "lucide-react";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { api } from "@/lib/api";

export function CommandPalette({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const navigate = useNavigate();
  const { data: kbs = [] } = useQuery<import("@/lib/api").KnowledgeBase[]>({
    queryKey: ["kbs"],
    queryFn: () => api.getKnowledgeBases(),
  });
  const { data: convos = [] } = useQuery({
    queryKey: ["all-convos", kbs.map((k) => k.id)],
    queryFn: async () => {
      const lists = await Promise.all(kbs.map((kb) => api.getConversationsForKb(kb.id)));
      return lists.flat();
    },
    enabled: kbs.length > 0,
  });
  const { data: docs = [] } = useQuery({
    queryKey: ["all-docs-palette", kbs.map((k) => k.id)],
    queryFn: async () => {
      const lists = await Promise.all(kbs.map((kb) => api.getDocuments(kb.id, 5)));
      return lists.flat();
    },
    enabled: kbs.length > 0,
  });
  const { data: verified = [] } = useQuery({
    queryKey: ["verified"],
    queryFn: () => api.getVerifiedAnswers(),
  });

  const go = (to: string, params?: Record<string, string>) => {
    onOpenChange(false);
    navigate({ to: to as never, params: params as never });
  };

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput placeholder="Rechercher une KB, un document, une conversation, une action…" />
      <CommandList className="max-h-[420px]">
        <CommandEmpty>Aucun résultat.</CommandEmpty>
        <CommandGroup heading="Actions">
          <CommandItem onSelect={() => go("/knowledge-bases")}>
            <Plus className="size-4" /> Créer une knowledge base
          </CommandItem>
          <CommandItem onSelect={() => go("/team")}>
            <UserPlus className="size-4" /> Inviter un membre
          </CommandItem>
          <CommandItem onSelect={() => go("/chat")}>
            <MessagesSquare className="size-4" /> Nouvelle conversation
          </CommandItem>
        </CommandGroup>
        <CommandSeparator />
        <CommandGroup heading="Knowledge bases">
          {kbs.map((kb) => (
            <CommandItem
              key={kb.id}
              value={kb.name}
              onSelect={() => go("/knowledge-bases/$kbId", { kbId: kb.id })}
            >
              <BookOpen className="size-4" />
              <span>{kb.name}</span>
              <span className="ml-auto text-xs text-muted-foreground">
                {kb.documentCount} documents
              </span>
            </CommandItem>
          ))}
        </CommandGroup>
        <CommandSeparator />
        <CommandGroup heading="Conversations">
          {convos.slice(0, 5).map((c) => (
            <CommandItem key={c.id} value={c.title ?? ""} onSelect={() => go("/chat")}>
              <MessagesSquare className="size-4" />
              <span className="truncate">{c.title ?? "Conversation"}</span>
            </CommandItem>
          ))}
        </CommandGroup>
        <CommandSeparator />
        <CommandGroup heading="Réponses vérifiées">
          {verified.slice(0, 4).map((v) => (
            <CommandItem key={v.id} value={v.question} onSelect={() => go("/verified")}>
              <ShieldCheck className="size-4 text-primary" />
              <span className="truncate">{v.question}</span>
            </CommandItem>
          ))}
        </CommandGroup>
        <CommandSeparator />
        <CommandGroup heading="Documents">
          {docs.slice(0, 6).map((d) => (
            <CommandItem
              key={d.id}
              value={d.title}
              onSelect={() => go("/knowledge-bases/$kbId", { kbId: d.kbId })}
            >
              <FileText className="size-4" />
              <span className="truncate">{d.title}</span>
              <span className="ml-auto text-xs text-muted-foreground">{d.status}</span>
            </CommandItem>
          ))}
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
