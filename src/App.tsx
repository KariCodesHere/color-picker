import {MutableRefObject, useCallback, useEffect, useRef, useState} from 'react'
import {TrashIcon} from '@radix-ui/react-icons'
import * as Tooltip from '@radix-ui/react-tooltip'
import {ColorSwatches} from './components/color-swatches'
import {IconButton} from './components/icon-button'
import {ImageDropzone} from './components/image-dropzone'
import {ImagePreview} from './components/image-preview'
import {ImageSelect} from './components/image-select'
import {Notification} from './components/notification'
import {rgbToHex, rgbToHsb, rgbToHsl, rgbToCmyk} from './utils'

export type SelectedColor = {
  isSelected: boolean
  cmyk: string
  hex: string
  hsb: string
  hsl: string
  rgb: string
}

export type SelectedColors = SelectedColor[]

function App() {
  const [image, setImage] = useState<string>('')
  const [cmyk, setCmyk] = useState<string>('')
  const [hex, setHex] = useState<string>('')
  const [hsb, setHsb] = useState<string>('')
  const [hsl, setHsl] = useState<string>('')
  const [rgb, setRgb] = useState<string>('')
  const [selectedColors, setSelectedColors] = useState<SelectedColors>([])
  const [notificationMsg, setNotificationMsg] = useState<string>('')
  const [open, setOpen] = useState<boolean>(false)
  const [isError, setIsError] = useState<boolean>(false)

  const canvasRef = useRef<HTMLCanvasElement>(null)
  const circleRef = useRef<HTMLDivElement>(null)
  const notificationTimerRef: MutableRefObject<number> = useRef(0)

  useEffect(() => {
    if (image) {
      const canvas: HTMLCanvasElement | null = canvasRef.current
      const ctx: CanvasRenderingContext2D | null | undefined = canvas?.getContext('2d')
      const img: HTMLImageElement = new Image()
      img.src = image
      img.crossOrigin = 'anonymous'
      if (canvas && ctx) {
        img.onload = () => {
          ctx.clearRect(0, 0, canvas.width, canvas.height)
          canvas.height = canvas.width * (img.height / img.width)
          canvas.width = img.width * 0.5
          canvas.height = img.height * 0.5
          ctx.drawImage(img as CanvasImageSource, 0, 0, canvas.width, canvas.height)
        }
      }
    }
  }, [image])

  const handleShowNotification = useCallback(() => {
    setOpen(false)
    window.clearTimeout(notificationTimerRef.current)
    notificationTimerRef.current = window.setTimeout(() => {
      setOpen(true)
    }, 10)
  }, [])

  const handleCopyColor = useCallback(
    async (color: string) => {
      setNotificationMsg(`${color} copied to clipboard!`)
      handleShowNotification()
      await navigator.clipboard.writeText(color)
    },
    [handleShowNotification],
  )

  useEffect(() => {
    const canvas: HTMLCanvasElement | null = canvasRef.current
    const circle: HTMLDivElement | null = circleRef.current

    const handleGetColor = (e: MouseEvent) => {
      const bounding: DOMRect | undefined = canvas?.getBoundingClientRect()
      let data: Uint8ClampedArray | undefined = undefined
      if (bounding && circle) {
        const x = e.clientX - bounding.left
        const y = e.clientY - bounding.top
        const pixel = canvas?.getContext('2d', {willReadFrequently: true})?.getImageData(x, y, 1, 1)
        data = pixel && pixel.data
      }
      if (data && circle) {
        const r = data[0]
        const g = data[1]
        const b = data[2]
        const rgb = `rgb(${r}, ${g}, ${b})`
        setRgb(rgb)
        setHex(rgbToHex(r, g, b))
        setHsl(rgbToHsl(r, g, b))
        setHsb(rgbToHsb(r, g, b))
        setCmyk(rgbToCmyk(r, g, b))
        circle.style.display = 'block'
        circle.style.left = e.pageX + 'px'
        circle.style.top = e.pageY + 'px'
        circle.style.background = rgb
      }
    }

    const handleSelectColor = () => {
      handleCopyColor(rgb)
      const isColorAlreadySelected: boolean = selectedColors.some(c => c.rgb === rgb)
      if (isColorAlreadySelected) {
        setNotificationMsg(`Color already selected! ${rgb} copied to clipboard`)
        setIsError(true)
        handleShowNotification()
      }
      if (!isColorAlreadySelected) {
        setIsError(false)
        const oldSelectedColors: SelectedColors = selectedColors.map(color => ({...color, isSelected: false}))
        setSelectedColors([...oldSelectedColors, {rgb, hex, hsb, hsl, cmyk, isSelected: true}])
      }
    }

    const handleClearColor = () => {
      setRgb('')
      if (circle) {
        circle.style.display = 'none'
      }
    }

    canvas?.addEventListener('mousemove', handleGetColor)
    canvas?.addEventListener('click', handleSelectColor)
    canvas?.addEventListener('mouseleave', handleClearColor)

    return () => {
      canvas?.removeEventListener('mousemove', handleGetColor)
      canvas?.removeEventListener('click', handleSelectColor)
      canvas?.removeEventListener('mouseleave', handleClearColor)
    }
  }, [cmyk, handleCopyColor, handleShowNotification, hex, hsb, hsl, image, rgb, selectedColors])

  useEffect(() => {
    return () => clearTimeout(notificationTimerRef.current)
  }, [])

  const handleClearPalette = () => {
    setSelectedColors([])
  }

  return (
    <Tooltip.Provider>
      <div className="min-w-[75vw] mb-40 dark:bg-bg-gray-950">
        <div className="flex justify-between w-[75vw] gap-4">
          <ColorSwatches handleCopyColor={handleCopyColor} selectedColors={selectedColors} />
          <div className="flex gap-2">
            {selectedColors.length ? (
              <Tooltip.Root>
                <Tooltip.Trigger asChild>
                  <IconButton aria-label="Clear palette" onClick={handleClearPalette}>
                    <TrashIcon />
                  </IconButton>
                </Tooltip.Trigger>
                <Tooltip.Portal>
                  <Tooltip.Content
                    className={`
                        rounded
                        p-2
                        bg-slate4
                        text-sm
                        text-slate12
                        leading-none
                        shadow-popover-sm
                        select-none
                        will-change-transform-opacity
                        data-[side=top]:animate-slideDownAndFade
                        data-[side=right]:animate-slideLeftAndFade
                        data-[side=bottom]:animate-slideUpAndFade
                        data-[side=left]:animate-slideRightAndFade
                        dark:bg-white
                        dark:text-slate4
                      `}
                    sideOffset={5}
                  >
                    Clear palette
                    <Tooltip.Arrow className="fill-slate4 dark:fill-white" />
                  </Tooltip.Content>
                </Tooltip.Portal>
              </Tooltip.Root>
            ) : null}
            <ImageSelect setImage={setImage} />
          </div>
        </div>
        {image ? (
          <div>
            <div ref={circleRef} className="w-40 h-40 rounded-full absolute hidden z-50"></div>
            <ImagePreview ref={canvasRef} />
          </div>
        ) : (
          <div className="mt-4">
            <ImageDropzone setImage={setImage}>Drop image here</ImageDropzone>
          </div>
        )}
        <Notification isError={isError} message={notificationMsg} open={open} setOpen={setOpen} />
      </div>
    </Tooltip.Provider>
  )
}

export default App
