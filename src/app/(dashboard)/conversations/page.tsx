import { ModulePlaceholder } from "@/components/layout/module-placeholder";
import { MessageSquare } from "lucide-react";

export default function ConversationsPage() {
  return (
    <ModulePlaceholder
      title="Unified Inbox & Messages"
      moduleName="Conversations"
      description="Omnichannel customer communications across SMS, messaging, and email."
      icon={MessageSquare}
      promptTarget="Upcoming Prompt 5"
      relatedTables={[
        "conversations",
        "messages",
        "contacts"
      ]}
      plannedFeatures={[
        "Unified inbox combining SMS, WhatsApp, and Telegram threads",
        "Inbound message idempotency by provider message ID",
        "Two-way dispatching to assigned lead owner",
        "Conversation thread history and timeline view"
      ]}
    />
  );
}
