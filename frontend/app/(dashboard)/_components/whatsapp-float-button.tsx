"use client";

import { useRef, useState } from "react";
import { FaWhatsapp } from "react-icons/fa";
import { X } from "lucide-react";

interface WhatsAppFloatButtonProps {
  consultantName?: string | null;
  consultantPhone?: string | null;
}

function createWhatsAppUrl(phone: string, message: string): string {
  const normalizedPhone = phone.replace(/\D/g, "").replace(/^0/, "90");

  return `https://wa.me/${normalizedPhone}?text=${encodeURIComponent(message)}`;
}

export function WhatsAppFloatButton({
  consultantName,
  consultantPhone,
}: WhatsAppFloatButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [positionY, setPositionY] = useState(0);

  const containerRef = useRef<HTMLDivElement | null>(null);

  const dragStartRef = useRef({
    pointerY: 0,
    positionY: 0,
  });

  const isDraggingRef = useRef(false);
  const hasDraggedRef = useRef(false);

  const displayedName = consultantName?.trim() || null;
  const displayedPhone = consultantPhone?.trim() || null;

  if (!displayedPhone) {
    return null;
  }

  const message = displayedName
    ? `Merhaba ${displayedName}, Teşvik360 paneli üzerinden yazıyorum.`
    : "Merhaba, Teşvik360 paneli üzerinden yazıyorum.";

  const whatsAppUrl = createWhatsAppUrl(displayedPhone, message);

  function clampY(nextY: number) {
    if (!containerRef.current) {
      return nextY;
    }

    const rect = containerRef.current.getBoundingClientRect();
    const padding = 12;

    const minY = -rect.top + padding;
    const maxY = window.innerHeight - rect.bottom - padding;

    return Math.min(Math.max(nextY, positionY + minY), positionY + maxY);
  }

  function handlePointerDown(event: React.PointerEvent<HTMLDivElement>) {
    isDraggingRef.current = true;
    hasDraggedRef.current = false;

    dragStartRef.current = {
      pointerY: event.clientY,
      positionY,
    };

    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function handlePointerMove(event: React.PointerEvent<HTMLDivElement>) {
    if (!isDraggingRef.current) {
      return;
    }

    const deltaY = event.clientY - dragStartRef.current.pointerY;

    if (Math.abs(deltaY) > 5) {
      hasDraggedRef.current = true;
    }

    const nextY = dragStartRef.current.positionY + deltaY;

    setPositionY(clampY(nextY));
  }

  function handlePointerUp(event: React.PointerEvent<HTMLDivElement>) {
    isDraggingRef.current = false;

    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  }

  function handleMainButtonClick() {
    if (hasDraggedRef.current) {
      hasDraggedRef.current = false;
      return;
    }

    setIsOpen((prev) => !prev);
  }

  return (
    <div
      ref={containerRef}
      className="fixed bottom-6 right-6 z-50 flex touch-none select-none items-end gap-3"
      style={{
        transform: `translateY(${positionY}px)`,
      }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
    >
      {/* AÇILAN KART */}
      {isOpen && (
        <div
          className="relative mb-1 w-[280px] rounded-2xl bg-white p-4 shadow-2xl ring-1 ring-slate-200/80"
          onPointerDown={(event) => event.stopPropagation()}
        >
          <button
            type="button"
            onClick={() => setIsOpen(false)}
            aria-label="Kapat"
            className="absolute right-3 top-3 flex h-7 w-7 items-center justify-center rounded-full text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
          >
            <X size={16} strokeWidth={2.5} />
          </button>

          <div className="pr-8">
            <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400">
              Uzmanınız
            </p>

            <p className="mt-1 text-base font-bold text-slate-800">
              {displayedName || "Uzmanınız"}
            </p>

            <p className="mt-1 text-sm leading-5 text-slate-500">
              Sorularınız için uzmanınızla WhatsApp üzerinden iletişime
              geçebilirsiniz.
            </p>
          </div>

          <a
            href={whatsAppUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-4 flex w-full items-center justify-center gap-2.5 rounded-xl bg-[#25D366] px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#1FB855] hover:shadow-md"
          >
            <FaWhatsapp size={21} aria-hidden="true" />
            <span>WhatsApp&apos;tan Yaz</span>
          </a>

          <p className="mt-2 text-center text-xs text-slate-400">
            {displayedPhone}
          </p>

          <span
            aria-hidden="true"
            className="absolute -right-1.5 bottom-7 h-3 w-3 rotate-45 bg-white ring-1 ring-slate-200/80"
          />
        </div>
      )}

      {/* ANA BUTON */}
      <button
        type="button"
        onClick={handleMainButtonClick}
        aria-label={
          isOpen
            ? "WhatsApp iletişim penceresini kapat"
            : "WhatsApp üzerinden iletişime geç"
        }
        className="group relative flex h-16 w-16 shrink-0 cursor-grab items-center justify-center rounded-full bg-[#25D366] text-white shadow-xl shadow-green-500/30 transition-all duration-200 hover:scale-105 hover:bg-[#1FB855] active:cursor-grabbing"
      >
        {isOpen ? (
          <X size={28} strokeWidth={2.4} aria-hidden="true" />
        ) : (
          <FaWhatsapp size={36} aria-hidden="true" />
        )}

        {!isOpen && (
          <span
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 animate-ping rounded-full bg-[#25D366] opacity-20"
          />
        )}
      </button>
    </div>
  );
}
