import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SearchableMultiSelect } from "../SearchableMultiSelect";

const OPTIONS = ["TypeScript", "JavaScript", "Python", "Java", "Go"];

describe("SearchableMultiSelect", () => {
  it("renders with label and placeholder", () => {
    render(
      <SearchableMultiSelect
        label="Languages"
        options={OPTIONS}
        selected={[]}
        onChange={jest.fn()}
        placeholder="Search languages..."
      />
    );

    expect(screen.getByLabelText(/languages/i)).toBeInTheDocument();
    expect(
      screen.getByPlaceholderText(/search languages/i)
    ).toBeInTheDocument();
  });

  it("shows dropdown when input is focused and typed into", async () => {
    const user = userEvent.setup();
    render(
      <SearchableMultiSelect
        label="Languages"
        options={OPTIONS}
        selected={[]}
        onChange={jest.fn()}
        placeholder="Search..."
      />
    );

    const input = screen.getByPlaceholderText(/search/i);
    await user.click(input);
    await user.type(input, "Type");

    expect(screen.getByText("TypeScript")).toBeInTheDocument();
    expect(screen.queryByText("Python")).not.toBeInTheDocument();
  });

  it("filters options based on search query", async () => {
    const user = userEvent.setup();
    render(
      <SearchableMultiSelect
        label="Languages"
        options={OPTIONS}
        selected={[]}
        onChange={jest.fn()}
        placeholder="Search..."
      />
    );

    const input = screen.getByPlaceholderText(/search/i);
    await user.click(input);
    await user.type(input, "Java");

    expect(screen.getByText("JavaScript")).toBeInTheDocument();
    expect(screen.getByText("Java")).toBeInTheDocument();
    expect(screen.queryByText("Python")).not.toBeInTheDocument();
  });

  it("calls onChange when an option is selected", async () => {
    const onChange = jest.fn();
    const user = userEvent.setup();
    render(
      <SearchableMultiSelect
        label="Languages"
        options={OPTIONS}
        selected={[]}
        onChange={onChange}
        placeholder="Search..."
      />
    );

    const input = screen.getByPlaceholderText(/search/i);
    await user.click(input);
    await user.type(input, "Py");
    await user.click(screen.getByText("Python"));

    expect(onChange).toHaveBeenCalledWith(["Python"]);
  });

  it("renders selected items as chips", () => {
    render(
      <SearchableMultiSelect
        label="Languages"
        options={OPTIONS}
        selected={["TypeScript", "Python"]}
        onChange={jest.fn()}
        placeholder="Search..."
      />
    );

    expect(screen.getByText("TypeScript")).toBeInTheDocument();
    expect(screen.getByText("Python")).toBeInTheDocument();
  });

  it("removes chip when X button is clicked", async () => {
    const onChange = jest.fn();
    const user = userEvent.setup();
    render(
      <SearchableMultiSelect
        label="Languages"
        options={OPTIONS}
        selected={["TypeScript", "Python"]}
        onChange={onChange}
        placeholder="Search..."
      />
    );

    const tsChip = screen.getByText("TypeScript").closest("[data-testid]");
    const removeBtn = within(tsChip!).getByRole("button", {
      name: /remove typescript/i,
    });
    await user.click(removeBtn);

    expect(onChange).toHaveBeenCalledWith(["Python"]);
  });

  it("hides already-selected options from dropdown", async () => {
    const user = userEvent.setup();
    render(
      <SearchableMultiSelect
        label="Languages"
        options={OPTIONS}
        selected={["JavaScript"]}
        onChange={jest.fn()}
        placeholder="Search..."
      />
    );

    const input = screen.getByPlaceholderText(/search/i);
    await user.click(input);
    await user.type(input, "Java");

    const listbox = screen.getByRole("listbox");
    // Java should be shown, but JavaScript is already selected so hidden
    expect(within(listbox).getByText("Java")).toBeInTheDocument();
    expect(
      within(listbox).queryByText("JavaScript")
    ).not.toBeInTheDocument();
  });

  it("closes dropdown on escape", async () => {
    const user = userEvent.setup();
    render(
      <SearchableMultiSelect
        label="Languages"
        options={OPTIONS}
        selected={[]}
        onChange={jest.fn()}
        placeholder="Search..."
      />
    );

    const input = screen.getByPlaceholderText(/search/i);
    await user.click(input);
    await user.type(input, "Py");
    expect(screen.getByRole("listbox")).toBeInTheDocument();

    await user.keyboard("{Escape}");
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
  });

  it("has accessible label connected to input", () => {
    render(
      <SearchableMultiSelect
        label="Languages"
        options={OPTIONS}
        selected={[]}
        onChange={jest.fn()}
        placeholder="Search..."
      />
    );

    const input = screen.getByLabelText(/languages/i);
    expect(input).toHaveAttribute("role", "combobox");
  });
});
