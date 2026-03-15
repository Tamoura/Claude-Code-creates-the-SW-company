import { render, screen, fireEvent } from "@testing-library/react";
import { ConversationSidebar } from "../ConversationSidebar";
import type { Conversation } from "@/types/chat";

const mockConversations: Conversation[] = [
  {
    id: "conv-1",
    title: "Architecture Review",
    createdAt: "2026-03-14T10:00:00Z",
    updatedAt: "2026-03-14T10:30:00Z",
    messageCount: 5,
  },
  {
    id: "conv-2",
    title: "Team Scaling Strategy",
    createdAt: "2026-03-13T09:00:00Z",
    updatedAt: "2026-03-13T09:45:00Z",
    messageCount: 8,
  },
  {
    id: "conv-3",
    title: "Cloud Migration Plan",
    createdAt: "2026-03-12T14:00:00Z",
    updatedAt: "2026-03-12T15:00:00Z",
    messageCount: 3,
  },
];

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: jest.fn() }),
  usePathname: () => "/chat",
}));

describe("ConversationSidebar", () => {
  it("renders conversation list", () => {
    render(
      <ConversationSidebar
        conversations={mockConversations}
        activeId={null}
        onNewConversation={jest.fn()}
        isLoading={false}
      />
    );
    expect(screen.getByText("Architecture Review")).toBeInTheDocument();
    expect(
      screen.getByText("Team Scaling Strategy")
    ).toBeInTheDocument();
    expect(
      screen.getByText("Cloud Migration Plan")
    ).toBeInTheDocument();
  });

  it("renders new conversation button", () => {
    render(
      <ConversationSidebar
        conversations={mockConversations}
        activeId={null}
        onNewConversation={jest.fn()}
        isLoading={false}
      />
    );
    expect(
      screen.getByRole("button", { name: /new conversation/i })
    ).toBeInTheDocument();
  });

  it("calls onNewConversation when button clicked", () => {
    const onNew = jest.fn();
    render(
      <ConversationSidebar
        conversations={mockConversations}
        activeId={null}
        onNewConversation={onNew}
        isLoading={false}
      />
    );
    fireEvent.click(
      screen.getByRole("button", { name: /new conversation/i })
    );
    expect(onNew).toHaveBeenCalled();
  });

  it("highlights active conversation", () => {
    const { container } = render(
      <ConversationSidebar
        conversations={mockConversations}
        activeId="conv-1"
        onNewConversation={jest.fn()}
        isLoading={false}
      />
    );
    const activeItem = container.querySelector(
      "[data-testid='conversation-conv-1']"
    );
    expect(activeItem).toHaveClass("bg-primary-100");
  });

  it("renders conversation links to /chat/:id", () => {
    render(
      <ConversationSidebar
        conversations={mockConversations}
        activeId={null}
        onNewConversation={jest.fn()}
        isLoading={false}
      />
    );
    const links = screen.getAllByRole("link");
    const hrefs = links.map((l) => l.getAttribute("href"));
    expect(hrefs).toContain("/chat/conv-1");
    expect(hrefs).toContain("/chat/conv-2");
    expect(hrefs).toContain("/chat/conv-3");
  });

  it("shows loading state", () => {
    render(
      <ConversationSidebar
        conversations={[]}
        activeId={null}
        onNewConversation={jest.fn()}
        isLoading={true}
      />
    );
    expect(screen.getByText(/loading/i)).toBeInTheDocument();
  });

  it("shows empty state when no conversations", () => {
    render(
      <ConversationSidebar
        conversations={[]}
        activeId={null}
        onNewConversation={jest.fn()}
        isLoading={false}
      />
    );
    expect(
      screen.getByText(/no conversations yet/i)
    ).toBeInTheDocument();
  });
});
