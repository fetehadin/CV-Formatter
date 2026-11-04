import { newId, type ListSection, type ListSectionMap, type Resume, type SectionKey } from "./schema"

/**
 * Pure helpers that return a new Resume. Components never mutate state;
 * they call these through `updateResume(r => ...)`.
 */

type Item<S extends ListSection> = ListSectionMap[S]

function setList<S extends ListSection>(r: Resume, section: S, list: Item<S>[]): Resume {
  return { ...r, [section]: list }
}

export function addItem<S extends ListSection>(r: Resume, section: S, item: Item<S>): Resume {
  return setList(r, section, [...(r[section] as Item<S>[]), item])
}

/** Puts an item back at a position (used by "Undo" after a delete). */
export function insertItem<S extends ListSection>(r: Resume, section: S, item: Item<S>, index: number): Resume {
  const list = [...(r[section] as Item<S>[])]
  list.splice(Math.max(0, Math.min(index, list.length)), 0, item)
  return setList(r, section, list)
}

export function updateItem<S extends ListSection>(r: Resume, section: S, id: string, patch: Partial<Item<S>>): Resume {
  const list = r[section] as Item<S>[]
  return setList(r, section, list.map((it) => (it.id === id ? { ...it, ...patch } : it)))
}

export function removeItem<S extends ListSection>(r: Resume, section: S, id: string): Resume {
  const list = r[section] as Item<S>[]
  return setList(r, section, list.filter((it) => it.id !== id))
}

/** Inserts a copy right after the original, with a fresh id. */
export function duplicateItem<S extends ListSection>(r: Resume, section: S, id: string): Resume {
  const list = r[section] as Item<S>[]
  const index = list.findIndex((it) => it.id === id)
  if (index === -1) return r
  const copy = { ...structuredClone(list[index]), id: newId() }
  return setList(r, section, [...list.slice(0, index + 1), copy, ...list.slice(index + 1)])
}

function move<T>(list: T[], from: number, to: number): T[] {
  if (from < 0 || to < 0 || from >= list.length || to >= list.length || from === to) return list
  const next = [...list]
  const [moved] = next.splice(from, 1)
  next.splice(to, 0, moved)
  return next
}

export function moveItem<S extends ListSection>(r: Resume, section: S, id: string, delta: -1 | 1): Resume {
  const list = r[section] as Item<S>[]
  const from = list.findIndex((it) => it.id === id)
  const next = move(list, from, from + delta)
  return next === list ? r : setList(r, section, next)
}

/** Moves a section past its next *visible* neighbour, so hidden sections never make a click look like it did nothing. */
export function moveSection(r: Resume, key: SectionKey, delta: -1 | 1): Resume {
  const order = r.sectionOrder
  const from = order.indexOf(key)
  let to = from + delta
  while (to >= 0 && to < order.length && r.design.hidden.includes(order[to])) to += delta
  if (from === -1 || to < 0 || to >= order.length) return r
  const next = [...order]
  next.splice(from, 1)
  next.splice(to, 0, key)
  return { ...r, sectionOrder: next }
}

/** Shows or hides a section. Its content is kept either way. */
export function setSectionHidden(r: Resume, key: SectionKey, hidden: boolean): Resume {
  const rest = r.design.hidden.filter((k) => k !== key)
  return { ...r, design: { ...r.design, hidden: hidden ? [...rest, key] : rest } }
}
