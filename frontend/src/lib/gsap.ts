import { useGSAP } from '@gsap/react'
import { gsap } from 'gsap'
import { CustomEase } from 'gsap/CustomEase'
import { DrawSVGPlugin } from 'gsap/DrawSVGPlugin'
import { Flip } from 'gsap/Flip'
import { ScrambleTextPlugin } from 'gsap/ScrambleTextPlugin'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { SplitText } from 'gsap/SplitText'

/** One registration for the whole app; import GSAP and its plugins from here. */
gsap.registerPlugin(
  useGSAP,
  ScrollTrigger,
  SplitText,
  Flip,
  DrawSVGPlugin,
  CustomEase,
  ScrambleTextPlugin,
)

export {
  CustomEase,
  DrawSVGPlugin,
  Flip,
  gsap,
  ScrambleTextPlugin,
  ScrollTrigger,
  SplitText,
  useGSAP,
}
