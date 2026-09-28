import { BadRequestException } from "@nestjs/common";

export type PageRequest = { page: number; pageSize: number; skip: number };

export const DEFAULT_PAGE_SIZE = 25;
export const MAX_PAGE_SIZE = 100;

/**
 * Parses the opt-in `page` / `pageSize` query parameters used by growing admin lists.
 * Returns null when `page` is absent so legacy array consumers keep their contract.
 */
export function parsePageRequest(page?: string, pageSize?: string): PageRequest | null {
  if (page === undefined || page === "") return null;
  const pageNumber = Number(page);
  const size = pageSize === undefined || pageSize === "" ? DEFAULT_PAGE_SIZE : Number(pageSize);
  if (!Number.isInteger(pageNumber) || pageNumber < 1 || !Number.isInteger(size) || size < 1) {
    throw new BadRequestException("Invalid page parameters.");
  }
  const bounded = Math.min(size, MAX_PAGE_SIZE);
  return { page: pageNumber, pageSize: bounded, skip: (pageNumber - 1) * bounded };
}

export type Paged<T, S> = { items: T[]; total: number; page: number; pageSize: number; summary: S };
