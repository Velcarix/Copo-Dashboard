import { useState, useEffect } from 'react'

interface ProductImageProps {
  src: string | null
  fallbackEmoji: string
  alt: string
  className?: string
}

export function ProductImage({ src, fallbackEmoji, alt, className = '' }: ProductImageProps) {
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    setFailed(false)
  }, [src])

  if (!src || failed) {
    return (
      <span role="img" aria-label={alt} className={`text-3xl leading-none ${className}`}>
        {fallbackEmoji}
      </span>
    )
  }

  return (
    <img
      src={src}
      alt={alt}
      onError={() => setFailed(true)}
      className={`object-cover ${className}`}
    />
  )
}
