import assert from 'node:assert/strict';
import { test } from 'node:test';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { locationReviewUrls } from '../lib/location-review.ts';
const { default: LocationReviewLinks } = await import('../components/LocationReviewLinks.tsx');

test('review URLs preserve exact coordinates, including zero, without labels or navigation parameters', () => {
  for (const point of [{ lat: 28.630001234, lng: -106.060045678 }, { lat: 0, lng: 0 }, { lat: -90, lng: 180 }]) {
    Object.freeze(point);
    const urls = locationReviewUrls(point), map = new URL(urls.map), street = new URL(urls.streetView);
    assert.equal(map.origin, 'https://www.google.com'); assert.equal(map.pathname, '/maps/search/');
    assert.deepEqual([...map.searchParams.keys()], ['api', 'query']);
    assert.equal(map.searchParams.get('api'), '1'); assert.equal(map.searchParams.get('query'), `${point.lat},${point.lng}`);
    assert.equal(street.origin, map.origin); assert.equal(street.pathname, '/maps/@');
    assert.deepEqual([...street.searchParams.keys()], ['api', 'map_action', 'viewpoint']);
    assert.equal(street.searchParams.get('map_action'), 'pano'); assert.equal(street.searchParams.get('viewpoint'), `${point.lat},${point.lng}`);
    assert.ok(urls.map.length < 2048 && urls.streetView.length < 2048);
  }
});

test('invalid or nonnumeric coordinates cannot produce an external review link', () => {
  for (const point of [null, undefined, {}, { lat: '28.63', lng: -106 }, { lat: NaN, lng: 0 }, { lat: 0, lng: Infinity }, { lat: 90.001, lng: 0 }, { lat: 0, lng: -180.001 }]) assert.equal(locationReviewUrls(point), null);
});

test('review controls are explicit external links with coverage/date limits and no embedded request or confirmation', () => {
  const html = renderToStaticMarkup(React.createElement(LocationReviewLinks, { point: { lat: 28.63, lng: -106.06 } }));
  assert.equal((html.match(/<a /g) || []).length, 2);
  assert.equal((html.match(/target="_blank" rel="noopener noreferrer"/g) || []).length, 2);
  assert.match(html, /Ver mapa/); assert.match(html, /Ver entorno en Street View/);
  assert.match(html, /imágenes antiguas o un punto cercano/); assert.match(html, /puede no haber cobertura/);
  assert.match(html, /no acredita acceso ni permiso/); assert.doesNotMatch(html, /<(iframe|img|script|button|input)\b/);
});

test('an invalid review point renders no links instead of opening a default location', () => {
  assert.equal(renderToStaticMarkup(React.createElement(LocationReviewLinks, { point: { lat: NaN, lng: 0 } })), '');
});
