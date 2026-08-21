import { type ReactNode } from 'react';
import { NavLink } from 'react-router-dom';

export interface NavItem {
  to: string;
  label: string;
  icon?: ReactNode;
  end?: boolean;
}

export interface NavSection {
  title?: string;
  items: NavItem[];
}

export interface SidebarProps {
  /** Product brand element (logo + name) */
  brand: ReactNode;
  /** Navigation sections */
  sections: NavSection[];
  /** Footer content (logout button, theme toggle, etc.) */
  footer?: ReactNode;
  /** Mobile open state */
  isOpen?: boolean;
  /** Callback when mobile sidebar should close */
  onClose?: () => void;
  /** Active link class. Default provided. */
  activeLinkClass?: string;
  /** Inactive link class. Default provided. */
  inactiveLinkClass?: string;
  /** Width class. Default: 'w-56' */
  widthClass?: string;
}

function SidebarNavItem({
  item,
  activeLinkClass,
  inactiveLinkClass,
  onClick,
}: {
  item: NavItem;
  activeLinkClass: string;
  inactiveLinkClass: string;
  onClick?: () => void;
}) {
  return (
    <NavLink
      to={item.to}
      end={item.end}
      onClick={onClick}
      className={({ isActive }) =>
        `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
          isActive ? activeLinkClass : inactiveLinkClass
        }`
      }
    >
      {item.icon}
      {item.label}
    </NavLink>
  );
}

export default function Sidebar({
  brand,
  sections,
  footer,
  isOpen = true,
  onClose,
  activeLinkClass = 'bg-blue-600 text-white',
  inactiveLinkClass = 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white',
  widthClass = 'w-56',
}: SidebarProps) {
  const handleNavClick = () => {
    if (onClose) onClose();
  };

  return (
    <>
      {/* Mobile backdrop */}
      {isOpen && onClose && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      <aside
        role="complementary"
        className={`fixed left-0 top-0 bottom-0 ${widthClass} bg-white dark:bg-gray-900 flex flex-col border-r border-gray-200 dark:border-gray-700 z-50 transition-transform duration-300 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        } md:translate-x-0`}
      >
        {/* Brand */}
        <div className="flex items-center gap-2.5 px-5 py-5 border-b border-gray-200 dark:border-gray-700">
          {brand}
        </div>

        {/* Navigation */}
        <nav role="navigation" aria-label="Main navigation" className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
          {sections.map((section, i) => (
            <div key={i}>
              {section.title && (
                <div className="pt-6 pb-2 px-3 first:pt-0">
                  <span className="text-[11px] font-semibold tracking-wider text-gray-400 dark:text-gray-500 uppercase">
                    {section.title}
                  </span>
                </div>
              )}
              {section.items.map((item) => (
                <SidebarNavItem
                  key={item.to}
                  item={item}
                  activeLinkClass={activeLinkClass}
                  inactiveLinkClass={inactiveLinkClass}
                  onClick={handleNavClick}
                />
              ))}
            </div>
          ))}
        </nav>

        {/* Footer */}
        {footer && (
          <div className="px-3 py-4 border-t border-gray-200 dark:border-gray-700">
            {footer}
          </div>
        )}
      </aside>
    </>
  );
}
