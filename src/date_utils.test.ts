import { test, expect, describe } from 'bun:test';
import date_utils from './date_utils';

describe('Date Utils', () => {
    describe('parse', () => {
        test('parses date string', () => {
            const date = date_utils.parse('2024-01-15');
            expect(date).toBeInstanceOf(Date);
            expect(date.getFullYear()).toBe(2024);
            expect(date.getMonth()).toBe(0); // January is 0
            expect(date.getDate()).toBe(15);
        });

        test('parses Date object', () => {
            const inputDate = new Date(2024, 0, 15);
            const date = date_utils.parse(inputDate);
            expect(date).toBe(inputDate);
        });
    });

    describe('diff', () => {
        test('calculates difference in days', () => {
            const date1 = new Date(2024, 0, 1);
            const date2 = new Date(2024, 0, 11);
            const diff = date_utils.diff(date2, date1, 'day');
            expect(diff).toBe(10);
        });

        test('calculates difference in hours', () => {
            const date1 = new Date(2024, 0, 1, 0, 0);
            const date2 = new Date(2024, 0, 1, 5, 0);
            const diff = date_utils.diff(date2, date1, 'hour');
            expect(diff).toBe(5);
        });

        test('calculates difference in months', () => {
            const date1 = new Date(2024, 0, 1);
            const date2 = new Date(2024, 3, 1);
            const diff = date_utils.diff(date2, date1, 'month');
            expect(diff).toBeGreaterThanOrEqual(2);
            expect(diff).toBeLessThanOrEqual(3);
        });
    });

    describe('add', () => {
        test('adds days to date', () => {
            const date = new Date(2024, 0, 1);
            const result = date_utils.add(date, 10, 'day');
            expect(result.getDate()).toBe(11);
        });

        test('adds hours to date', () => {
            const date = new Date(2024, 0, 1, 0, 0);
            const result = date_utils.add(date, 5, 'hour');
            expect(result.getHours()).toBe(5);
        });

        test('adds months to date', () => {
            const date = new Date(2024, 0, 1);
            const result = date_utils.add(date, 2, 'month');
            expect(result.getMonth()).toBe(2); // March
        });

        test('handles negative values', () => {
            const date = new Date(2024, 0, 10);
            const result = date_utils.add(date, -5, 'day');
            expect(result.getDate()).toBe(5);
        });
    });

    describe('start_of', () => {
        test('gets start of day', () => {
            const date = new Date(2024, 0, 15, 14, 30, 45);
            const result = date_utils.start_of(date, 'day');
            expect(result.getHours()).toBe(0);
            expect(result.getMinutes()).toBe(0);
            expect(result.getSeconds()).toBe(0);
        });

        test('gets start of month', () => {
            const date = new Date(2024, 0, 15);
            const result = date_utils.start_of(date, 'month');
            expect(result.getDate()).toBe(1);
        });

        test('gets start of year', () => {
            const date = new Date(2024, 5, 15);
            const result = date_utils.start_of(date, 'year');
            expect(result.getMonth()).toBe(0);
            expect(result.getDate()).toBe(1);
        });
    });

    describe('format', () => {
        test('formats date with YYYY-MM-DD', () => {
            const date = new Date(2024, 0, 15);
            const formatted = date_utils.format(date, 'YYYY-MM-DD');
            expect(formatted).toMatch(/2024-01-15/);
        });

        test('formats date with custom format', () => {
            const date = new Date(2024, 0, 15);
            const formatted = date_utils.format(date, 'DD/MM/YYYY');
            expect(formatted).toMatch(/15\/01\/2024/);
        });
    });

    describe('parse_duration', () => {
        test('parses day duration', () => {
            const result = date_utils.parse_duration('5d');
            expect(result.duration).toBe(5);
            expect(result.scale).toBe('day');
        });

        test('parses hour duration', () => {
            const result = date_utils.parse_duration('12h');
            expect(result.duration).toBe(12);
            expect(result.scale).toBe('hour');
        });

        test('parses month duration', () => {
            const result = date_utils.parse_duration('3m');
            expect(result.duration).toBe(3);
            expect(result.scale).toBe('month');
        });

        test('parses week duration', () => {
            const result = date_utils.parse_duration('2w');
            expect(result.duration).toBe(2);
            expect(result.scale).toBe('week');
        });
    });
});
