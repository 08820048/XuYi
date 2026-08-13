'use client'

import { useEffect, useId, useState } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { parse } from 'opentype.js'

interface SignatureLogoProps {
  className?: string
  label?: string
}

const FONT_SIZE = 32
const BASELINE = 40
const PADDING = 4
const REVEAL_STROKE_WIDTH = FONT_SIZE * 0.22
const BOUNDS_PADDING = REVEAL_STROKE_WIDTH / 2 + 3

interface SignatureBounds {
  x: number
  y: number
  width: number
  height: number
}

export function SignatureLogo({
  className = '',
  label = 'XuYi',
}: SignatureLogoProps) {
  const [paths, setPaths] = useState<string[]>([])
  const [bounds, setBounds] = useState<SignatureBounds>({
    x: -BOUNDS_PADDING,
    y: -BOUNDS_PADDING,
    width: 210 + BOUNDS_PADDING * 2,
    height: 52 + BOUNDS_PADDING * 2,
  })
  const reduceMotion = useReducedMotion()
  const maskId = `signature-reveal-${useId().replace(/:/g, '')}`

  useEffect(() => {
    let cancelled = false

    fetch('/LastoriaBoldRegular.otf')
      .then((response) => {
        if (!response.ok) throw new Error(`Font request failed: ${response.status}`)
        return response.arrayBuffer()
      })
      .then((buffer) => parse(buffer))
      .then((font) => {
        if (cancelled) return

        let x = PADDING
        const nextPaths: string[] = []
        let minX = Number.POSITIVE_INFINITY
        let minY = Number.POSITIVE_INFINITY
        let maxX = Number.NEGATIVE_INFINITY
        let maxY = Number.NEGATIVE_INFINITY

        for (const character of label) {
          const glyph = font.charToGlyph(character)
          const glyphPath = glyph.getPath(x, BASELINE, FONT_SIZE)
          const glyphBounds = glyphPath.getBoundingBox()
          nextPaths.push(glyphPath.toPathData(3))
          minX = Math.min(minX, glyphBounds.x1)
          minY = Math.min(minY, glyphBounds.y1)
          maxX = Math.max(maxX, glyphBounds.x2)
          maxY = Math.max(maxY, glyphBounds.y2)
          const advanceWidth = glyph.advanceWidth ?? font.unitsPerEm
          x += advanceWidth * (FONT_SIZE / font.unitsPerEm)
        }

        setPaths(nextPaths)
        setBounds({
          x: minX - BOUNDS_PADDING,
          y: minY - BOUNDS_PADDING,
          width: maxX - minX + BOUNDS_PADDING * 2,
          height: maxY - minY + BOUNDS_PADDING * 2,
        })
      })
      .catch((error) => {
        console.error('Signature font load failed:', error)
      })

    return () => {
      cancelled = true
    }
  }, [label])

  return (
    <motion.svg
      viewBox={`${bounds.x} ${bounds.y} ${bounds.width} ${bounds.height}`}
      role="img"
      aria-label={label}
      className={`signature-logo ${className}`}
      preserveAspectRatio="xMinYMid meet"
      initial={false}
    >
      <defs>
        <mask
          id={maskId}
          maskUnits="userSpaceOnUse"
          x={bounds.x}
          y={bounds.y}
          width={bounds.width}
          height={bounds.height}
        >
          {paths.map((path, index) => (
            <motion.path
              key={`${index}-${path}`}
              d={path}
              fill="none"
              stroke="white"
              strokeWidth={REVEAL_STROKE_WIDTH}
              strokeLinecap="round"
              strokeLinejoin="round"
              initial={{ pathLength: reduceMotion ? 1 : 0, opacity: 1 }}
              animate={{ pathLength: 1, opacity: 1 }}
              transition={{
                pathLength: {
                  delay: reduceMotion ? 0 : index * 0.2,
                  duration: reduceMotion ? 0 : 1.5,
                  ease: 'easeInOut',
                },
              }}
            />
          ))}
        </mask>
      </defs>

      {paths.map((path, index) => (
        <motion.path
          key={`outline-${index}-${path}`}
          d={path}
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="butt"
          strokeLinejoin="round"
          initial={{ pathLength: reduceMotion ? 1 : 0, opacity: reduceMotion ? 1 : 0 }}
          animate={{ pathLength: 1, opacity: 1 }}
          transition={{
            pathLength: {
              delay: reduceMotion ? 0 : index * 0.2,
              duration: reduceMotion ? 0 : 1.5,
              ease: 'easeInOut',
            },
            opacity: {
              delay: reduceMotion ? 0 : index * 0.2 + 0.01,
              duration: reduceMotion ? 0 : 0.01,
            },
          }}
        />
      ))}

      <g mask={`url(#${maskId})`}>
        {paths.map((path, index) => (
          <path key={`${index}-${path}`} d={path} fill="currentColor" />
        ))}
      </g>
    </motion.svg>
  )
}
