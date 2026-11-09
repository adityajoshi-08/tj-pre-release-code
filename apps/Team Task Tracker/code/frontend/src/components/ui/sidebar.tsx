import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { PanelLeft } from 'lucide-react';
import { cn } from '../../lib/utils';
import { Button } from './button';
import { Sheet, SheetContent, SheetDescription, SheetTitle } from './sheet';

/*
  shadcn/ui's Sidebar, trimmed to what this app uses: the "inset" variant, collapsible to an icon rail on desktop and
  a sheet on phones. Pieces keep shadcn's names (SidebarProvider, SidebarInset, SidebarMenuButton …) and classes.
*/

const MOBILE_QUERY = '(max-width: 767px)';

const subscribeMobile = (onChange: () => void) => {
  const query = window.matchMedia(MOBILE_QUERY);
  query.addEventListener('change', onChange);
  return () => query.removeEventListener('change', onChange);
};
const useIsMobile = () => React.useSyncExternalStore(subscribeMobile, () => window.matchMedia(MOBILE_QUERY).matches);

type SidebarContextValue = {
  state: 'expanded' | 'collapsed';
  open: boolean;
  setOpen: (open: boolean) => void;
  openMobile: boolean;
  setOpenMobile: (open: boolean) => void;
  isMobile: boolean;
  toggleSidebar: () => void;
};

const SidebarContext = React.createContext<SidebarContextValue | null>(null);

function useSidebar() {
  const context = React.useContext(SidebarContext);
  if (!context) throw new Error('useSidebar must be used within a SidebarProvider.');
  return context;
}

function SidebarProvider({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  const isMobile = useIsMobile();
  const [open, setOpen] = React.useState(true);
  const [openMobile, setOpenMobile] = React.useState(false);

  const toggleSidebar = React.useCallback(() => {
    if (isMobile) setOpenMobile((value) => !value);
    else setOpen((value) => !value);
  }, [isMobile]);

  // Ctrl/Cmd+B, as in shadcn.
  React.useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key.toLowerCase() === 'b' && (event.metaKey || event.ctrlKey)) {
        event.preventDefault();
        toggleSidebar();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [toggleSidebar]);

  const value = React.useMemo<SidebarContextValue>(
    () => ({
      state: open ? 'expanded' : 'collapsed',
      open,
      setOpen,
      openMobile,
      setOpenMobile,
      isMobile,
      toggleSidebar,
    }),
    [open, openMobile, isMobile, toggleSidebar]
  );

  return (
    <SidebarContext.Provider value={value}>
      <div data-slot="sidebar-wrapper" className={cn('flex min-h-svh w-full bg-sidebar', className)} {...props}>
        {children}
      </div>
    </SidebarContext.Provider>
  );
}

function Sidebar({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  const { state, isMobile, openMobile, setOpenMobile } = useSidebar();

  if (isMobile) {
    return (
      <Sheet open={openMobile} onOpenChange={setOpenMobile}>
        <SheetContent side="left" className="w-72 gap-0 border-r bg-sidebar p-0 text-sidebar-foreground sm:max-w-72">
          <SheetTitle className="sr-only">Navigation</SheetTitle>
          <SheetDescription className="sr-only">The app's screens and your account.</SheetDescription>
          <div data-state="expanded" className="group/sidebar flex h-full w-full flex-col">
            {children}
          </div>
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <aside
      data-slot="sidebar"
      data-state={state}
      className={cn(
        'group/sidebar sticky top-0 flex h-svh shrink-0 flex-col text-sidebar-foreground transition-[width] duration-200 ease-linear',
        state === 'expanded' ? 'w-64' : 'w-12',
        className
      )}
      {...props}
    >
      {children}
    </aside>
  );
}

function SidebarTrigger({ className, onClick, ...props }: React.ComponentProps<typeof Button>) {
  const { toggleSidebar, state, isMobile } = useSidebar();
  return (
    <Button
      data-slot="sidebar-trigger"
      variant="ghost"
      size="icon"
      className={cn('size-7', className)}
      aria-label={isMobile ? 'Open navigation' : state === 'expanded' ? 'Collapse sidebar' : 'Expand sidebar'}
      onClick={(event) => {
        onClick?.(event);
        toggleSidebar();
      }}
      {...props}
    >
      <PanelLeft aria-hidden="true" />
    </Button>
  );
}

function SidebarInset({ className, ...props }: React.HTMLAttributes<HTMLElement>) {
  return (
    <main
      data-slot="sidebar-inset"
      className={cn(
        'relative flex min-h-svh w-full min-w-0 flex-1 flex-col bg-background md:m-2 md:ml-0 md:min-h-[calc(100svh-1rem)] md:rounded-xl md:shadow-sm md:ring-1 md:ring-sidebar-border/60',
        className
      )}
      {...props}
    />
  );
}

const SidebarHeader = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div data-slot="sidebar-header" className={cn('flex flex-col gap-2 p-2', className)} {...props} />
);
const SidebarFooter = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div data-slot="sidebar-footer" className={cn('flex flex-col gap-2 p-2', className)} {...props} />
);
const SidebarContent = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    data-slot="sidebar-content"
    className={cn('flex min-h-0 flex-1 flex-col gap-2 overflow-auto group-data-[state=collapsed]/sidebar:overflow-hidden', className)}
    {...props}
  />
);
const SidebarGroup = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div data-slot="sidebar-group" className={cn('relative flex w-full min-w-0 flex-col p-2', className)} {...props} />
);
const SidebarGroupLabel = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    data-slot="sidebar-group-label"
    className={cn(
      'flex h-8 shrink-0 items-center rounded-md px-2 text-xs font-medium text-sidebar-foreground/70 transition-[margin,opacity] duration-200 ease-linear group-data-[state=collapsed]/sidebar:-mt-8 group-data-[state=collapsed]/sidebar:opacity-0',
      className
    )}
    {...props}
  />
);
const SidebarMenu = ({ className, ...props }: React.HTMLAttributes<HTMLUListElement>) => (
  <ul data-slot="sidebar-menu" className={cn('flex w-full min-w-0 flex-col gap-1', className)} {...props} />
);
const SidebarMenuItem = ({ className, ...props }: React.HTMLAttributes<HTMLLIElement>) => (
  <li data-slot="sidebar-menu-item" className={cn('group/menu-item relative', className)} {...props} />
);

type MenuButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  asChild?: boolean;
  isActive?: boolean;
  size?: 'default' | 'lg';
};

const SidebarMenuButton = React.forwardRef<HTMLButtonElement, MenuButtonProps>(
  ({ asChild = false, isActive = false, size = 'default', className, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button';
    return (
      <Comp
        ref={ref}
        data-slot="sidebar-menu-button"
        data-active={isActive}
        className={cn(
          'peer/menu-button flex w-full items-center gap-2 overflow-hidden rounded-md p-2 text-left text-sm outline-none ring-sidebar-ring transition-[width,height,padding] hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:ring-2 active:bg-sidebar-accent active:text-sidebar-accent-foreground disabled:pointer-events-none disabled:opacity-50 data-[active=true]:bg-sidebar-accent data-[active=true]:font-medium data-[active=true]:text-sidebar-accent-foreground [&>span:last-child]:truncate [&>svg]:size-4 [&>svg]:shrink-0',
          size === 'lg' ? 'h-12 group-data-[state=collapsed]/sidebar:!p-0' : 'h-8',
          'group-data-[state=collapsed]/sidebar:!size-8 group-data-[state=collapsed]/sidebar:!p-2',
          size === 'lg' && 'group-data-[state=collapsed]/sidebar:!p-0',
          className
        )}
        {...props}
      />
    );
  }
);
SidebarMenuButton.displayName = 'SidebarMenuButton';

export {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
  useSidebar,
};
