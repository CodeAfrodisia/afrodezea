// src/components/profile/WidgetGrid.jsx
import React, {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  useCallback,
} from "react";
import {
  DndContext,
  PointerSensor,
  useSensor,
  useSensors,
  DragOverlay,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  arrayMove,
  rectSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

/* -----------------------------
   Masonry tuning (match your CSS)
--------------------------------*/
const ROW = 8;   // grid-auto-rows (px)
const GAP = 16;  // grid gap (px)

function sizeToColSpan(size) {
  switch ((size || "md").toLowerCase()) {
    case "sm": return "span 1";
    case "lg": return "span 2";
    case "xl": return "span 3";
    case "md":
    default:   return "span 2";
  }
}

function getOuterHeight(el) {
  if (!el) return 0;
  const rect = el.getBoundingClientRect();
  const cs = getComputedStyle(el);
  const mt = parseFloat(cs.marginTop) || 0;
  const mb = parseFloat(cs.marginBottom) || 0;
  return rect.height + mt + mb;
}
function measureRows(el) {
  const h = getOuterHeight(el);
  return Math.max(1, Math.ceil((h + GAP) / (ROW + GAP)));
}

function composeRefs(...refs) {
  return (node) => refs.forEach((r) => {
    if (!r) return;
    if (typeof r === "function") r(node);
    else r.current = node;
  });
}

/* -----------------------------
   MasonryCell: measured grid item
--------------------------------*/
function MasonryCell({
  id,
  size,
  editing,
  onDelete,
  nodeRef,            // from useSortable
  sortableStyle,      // transform/transition from useSortable
  dragProps,          // attributes + listeners (applied to handle)
  isDragging,
  children,
}) {
  const measureRef = useRef(null);
  const [rowSpan, setRowSpan] = useState(1);

  const remeasure = useCallback(() => {
    if (isDragging) return; // freeze during drag
    const el = measureRef.current;
    if (!el) return;
    setRowSpan(measureRows(el));
  }, [isDragging]);

  // initial + next tick
  useLayoutEffect(() => {
    requestAnimationFrame(() => {
      requestAnimationFrame(remeasure);
    });
  }, [remeasure]);

  // keep measuring on size mutations
  useEffect(() => {
    const el = measureRef.current;
    if (!el) return;

    const ro = new ResizeObserver(() => remeasure());
    ro.observe(el);

    const onWin = () => remeasure();
    window.addEventListener("resize", onWin);

    const imgs = el.querySelectorAll("img");
    const onImg = () => remeasure();
    imgs.forEach((img) => {
      if (!img.complete) {
        img.addEventListener("load", onImg, { once: true });
        img.addEventListener("error", onImg, { once: true });
      }
    });

    const t1 = setTimeout(remeasure, 250);
    const t2 = setTimeout(remeasure, 800);

    return () => {
      ro.disconnect();
      window.removeEventListener("resize", onWin);
      clearTimeout(t1);
      clearTimeout(t2);
      imgs.forEach((img) => {
        img.removeEventListener("load", onImg);
        img.removeEventListener("error", onImg);
      });
    };
  }, [remeasure]);

  return (
    <div
      style={{
        gridColumn: sizeToColSpan(size),
        gridRow: `span ${rowSpan}`,
        position: "relative",
        borderRadius: 16,
        boxSizing: "border-box",
        // keep the sortable transform on the grid item wrapper
        transform: sortableStyle?.transform,
        transition: sortableStyle?.transition,
        zIndex: sortableStyle?.zIndex || 1,
        cursor: sortableStyle?.cursor || "default",
        willChange: "transform",
      }}
      // attach the dnd "mount" ref to the *measured* element wrapper (below via composeRefs)
    >
      {editing && (
        <div
          style={{
            position: "absolute",
            top: 8,
            right: 8,
            display: "flex",
            gap: 6,
            zIndex: 2,
            pointerEvents: "auto",
          }}
        >
          {onDelete && (
            <button
              className="btn btn--ghost"
              title="Delete"
              aria-label="Delete widget"
              onClick={() => onDelete(id)}
            >
              🗑
            </button>
          )}
          <div
            // drag handle: we attach attributes+listeners here
            {...dragProps}
            style={{
              padding: "4px 8px",
              border: "1px solid var(--hairline)",
              borderRadius: 8,
              opacity: 0.7,
              cursor: "grab",
              userSelect: "none",
            }}
          >
            ⋮⋮ Drag
          </div>
        </div>
      )}

      {/* The element we measure; also where dnd-kit mounts the draggable node */}
      <div
        ref={composeRefs(measureRef, nodeRef)}
        style={{
          boxSizing: "border-box",
          position: "relative",
        }}
      >
        {/* hide original contents while dragging (stable placeholder) */}
        <div style={{ opacity: isDragging ? 0 : 1, pointerEvents: isDragging ? "none" : "auto" }}>
          {children}
        </div>
      </div>
    </div>
  );
}

/* -----------------------------
   SortableItem: wires useSortable
--------------------------------*/
function SortableItem({ item, editing, onDelete, renderItem }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: String(item.id) });

  const sortableStyle = {
    transform: CSS.Transform.toString(transform),
    transition: isDragging ? "transform 0s" : transition,
    zIndex: isDragging ? 10 : 1,
    cursor: editing ? "grab" : "default",
  };

  return (
    <MasonryCell
      id={item.id}
      size={item.size}
      editing={editing}
      onDelete={onDelete}
      nodeRef={setNodeRef}
      sortableStyle={sortableStyle}
      dragProps={editing ? { ...attributes, ...listeners } : {}}
      isDragging={isDragging}
    >
      {renderItem(item)}
    </MasonryCell>
  );
}

/* -----------------------------
   WidgetGrid: public API
--------------------------------*/
export default function WidgetGrid({
  items = [],
  renderItem,
  editing = false,
  onReorder,         // (nextIds: string[]) => void
  onDelete,          // (id) => void
}) {
  const ordered = useMemo(
    () => [...items].sort((a, b) => (a.position ?? 0) - (b.position ?? 0)),
    [items]
  );
  const ids = useMemo(() => ordered.map((w) => String(w.id)), [ordered]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } })
  );

  const [activeId, setActiveId] = useState(null);
  const [overlayItem, setOverlayItem] = useState(null);
  const [overlaySize, setOverlaySize] = useState({ width: 0, height: 0 });

  function handleDragStart(event) {
    const id = String(event.active.id);
    setActiveId(id);
    const item = ordered.find((w) => String(w.id) === id) || null;
    setOverlayItem(item);
    const rect = event.active?.rect?.current?.initial;
    if (rect) setOverlaySize({ width: rect.width, height: rect.height });
  }

  function handleDragEnd(event) {
    const { active, over } = event;
    setActiveId(null);
    setOverlayItem(null);
    if (!over || active.id === over.id) return;

    const oldIndex = ids.indexOf(String(active.id));
    const newIndex = ids.indexOf(String(over.id));
    const nextIds = arrayMove(ids, oldIndex, newIndex);
    onReorder?.(nextIds);
  }

  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={() => { setActiveId(null); setOverlayItem(null); }}
    >
      <SortableContext items={ids} strategy={rectSortingStrategy}>
        <div
          style={{
            display: "grid",
            gap: GAP,
            gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
            gridAutoRows: ROW,
            gridAutoFlow: "dense",    // backfill holes
            alignItems: "start",
            contain: "layout",        // isolate layout (less jitter)
            userSelect: editing ? "none" : "auto",
          }}
        >
          {ordered.map((item) => (
            <SortableItem
              key={item.id}
              item={item}
              editing={editing}
              onDelete={onDelete}
              renderItem={renderItem}
            />
          ))}
        </div>
      </SortableContext>

      {/* Smooth overlay clone so the real grid item can stay put as a placeholder */}
      <DragOverlay dropAnimation={null}>
        {overlayItem ? (
          <div
            style={{
              width: overlaySize.width || 360,
              height: overlaySize.height || "auto",
              pointerEvents: "none",
            }}
          >
            {renderItem(overlayItem)}
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
