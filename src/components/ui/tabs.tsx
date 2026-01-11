"use client";

import * as React from "react";

import * as TabsPrimitive from "@radix-ui/react-tabs";
import { motion } from "motion/react";

import { cn } from "@/lib/utils";

const TabsContext = React.createContext<{ activeValue?: string }>({});

function Tabs({ className, value, defaultValue, onValueChange, ...props }: React.ComponentProps<typeof TabsPrimitive.Root>) {
    const [activeTab, setActiveTab] = React.useState(value || defaultValue);

    const handleValueChange = (val: string) => {
        setActiveTab(val);
        onValueChange?.(val);
    };

    return (
        <TabsContext.Provider value={{ activeValue: activeTab }}>
            <TabsPrimitive.Root data-slot="tabs" value={activeTab} onValueChange={handleValueChange} className={cn("flex flex-col gap-2", className)} {...props} />
        </TabsContext.Provider>
    );
}

function TabsList({ className, ...props }: React.ComponentProps<typeof TabsPrimitive.List>) {
    return <TabsPrimitive.List data-slot="tabs-list" className={cn("bg-muted text-muted-foreground relative inline-flex h-9 w-fit items-center justify-center rounded-lg p-[3px]", className)} {...props} />;
}

function TabsTrigger({ className, value, children, ...props }: React.ComponentProps<typeof TabsPrimitive.Trigger>) {
    const context = React.useContext(TabsContext);
    const isActive = context.activeValue === value;

    return (
        <TabsPrimitive.Trigger
            value={value}
            data-slot="tabs-trigger"
            className={cn(
                "relative text-foreground dark:text-muted-foreground inline-flex h-[calc(100%-1px)] flex-1 items-center justify-center gap-1.5 rounded-md border border-transparent px-2 py-1 text-sm font-medium whitespace-nowrap transition-colors focus-visible:ring-[3px] focus-visible:outline-1 disabled:pointer-events-none disabled:opacity-50 z-10",
                className,
            )}
            {...props}
        >
            <span className="relative z-20">{children}</span>
            {isActive && <motion.div layoutId="active-tab-indicator" className="bg-background dark:bg-input/50 absolute inset-0 rounded-md shadow-sm z-10" transition={{ type: "spring", bounce: 0.18, duration: 0.25 }} />}
        </TabsPrimitive.Trigger>
    );
}

function TabsContent({ className, ...props }: React.ComponentProps<typeof TabsPrimitive.Content>) {
    return <TabsPrimitive.Content data-slot="tabs-content" className={cn("flex-1 outline-none", className)} {...props} />;
}

export { Tabs, TabsList, TabsTrigger, TabsContent };
