import type { ComponentProps, CSSProperties, ReactNode } from "react"
import { DndContext, KeyboardSensor, PointerSensor, closestCenter, useSensor, useSensors, type Announcements, type DragEndEvent, type Modifier } from "@dnd-kit/core"
import { SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { GripVertical } from "lucide-react"
import { cn } from "@/lib/utils"

/** Lists only move up and down, so a drag never drifts sideways. */
const verticalOnly: Modifier = ({ transform }) => ({ ...transform, x: 0 })

/**
 * A vertical list you reorder by dragging a grip handle. Works with a mouse,
 * touch (the handle has `touch-action: none`, so the page still scrolls
 * everywhere else) and the keyboard: focus the handle, Space to pick up,
 * arrows to move, Space to drop, Escape to cancel.
 */
export function SortableList<T extends string>({ ids, onMove, label, children }: { ids: T[]; onMove: (id: T, overId: T) => void; label: (id: T) => string; children: ReactNode }) {
  const sensors = useSensors(
    // A few pixels of travel before a drag starts, so a click on the handle stays a click.
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )
  const name = (id: string | number) => label(String(id) as T)
  const position = (id: string | number) => `position ${ids.indexOf(String(id) as T) + 1} of ${ids.length}`
  const announcements: Announcements = {
    onDragStart: ({ active }) => `Picked up ${name(active.id)}, ${position(active.id)}.`,
    onDragOver: ({ active, over }) => (over ? `${name(active.id)} moved to ${position(over.id)}.` : undefined),
    onDragEnd: ({ active, over }) => (over ? `${name(active.id)} dropped at ${position(over.id)}.` : `${name(active.id)} dropped.`),
    onDragCancel: ({ active }) => `Cancelled. ${name(active.id)} is back where it was.`,
  }

  const end = ({ active, over }: DragEndEvent) => {
    if (over && active.id !== over.id) onMove(String(active.id) as T, String(over.id) as T)
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      modifiers={[verticalOnly]}
      onDragEnd={end}
      accessibility={{
        announcements,
        screenReaderInstructions: { draggable: "To reorder, press Space on the handle, move with the up and down arrow keys, then press Space again to drop. Escape cancels." },
      }}
    >
      <SortableContext items={ids} strategy={verticalListSortingStrategy}>
        {children}
      </SortableContext>
    </DndContext>
  )
}

type HandleProps = ComponentProps<"button">

/** One row: `ref` and `style` go on the row, `handle` on its `DragHandle`. */
export function useSortableRow(id: string) {
  const { setNodeRef, setActivatorNodeRef, attributes, listeners, transform, transition, isDragging } = useSortable({ id })
  const style: CSSProperties = {
    // Translate, not Transform: rows have different heights and must not be stretched.
    transform: CSS.Translate.toString(transform),
    transition,
    position: "relative",
    zIndex: isDragging ? 10 : undefined,
  }
  const handle = { ref: setActivatorNodeRef, ...attributes, ...listeners } as HandleProps
  return { ref: setNodeRef, style, isDragging, handle }
}

/** The grip a row is dragged by. */
export function DragHandle({ handle, label, className }: { handle: HandleProps; label: string; className?: string }) {
  return (
    <button
      type="button"
      {...handle}
      aria-label={`Drag to reorder ${label}`}
      title="Drag to reorder"
      className={cn(
        "flex size-7 shrink-0 cursor-grab touch-none items-center justify-center rounded-md text-muted-foreground/70 outline-none hover:bg-muted hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 active:cursor-grabbing",
        className,
      )}
    >
      <GripVertical className="size-4" />
    </button>
  )
}

/** Shared look for the row being dragged: lifted above the others. */
export const draggingClass = "shadow-lg ring-1 ring-primary/30"
