import React from "react"
import Svg, { Path, G, Defs, ClipPath } from "react-native-svg"

export default function RoamUsLogo({ width = 300, height = 300 }: { width?: number; height?: number }) {
  return (
    <Svg width={width} height={height} viewBox="0 50 300 240">
      <Defs>
        <ClipPath id="clip1">
          <Path d="M.984 0h80.032v80.031H.984Z" />
        </ClipPath>
        <ClipPath id="clip2">
          <Path d="M14.855 80.137H67.38v56.273H14.855Z" />
        </ClipPath>
        <ClipPath id="clip3">
          <Path d="M0 0h82v141H0z" />
        </ClipPath>
      </Defs>
      
      <G clipPath="url(#clip3)" transform="translate(109 30)">
        <G clipPath="url(#clip1)">
          <Path fill="#e8692a" d="M41 57.64c-9.734 0-17.625-7.89-17.625-17.624 0-9.735 7.89-17.625 17.625-17.625s17.625 7.89 17.625 17.625S50.735 57.64 41 57.64M41 0C18.898 0 .984 17.914.984 40.016S18.898 80.03 41 80.03s40.016-17.914 40.016-40.015C81.016 17.914 63.102 0 41 0" />
        </G>
        <G clipPath="url(#clip2)">
          <Path fill="#e8692a" d="m39.172 81.23-24.129 52.286a2.02 2.02 0 0 0 .562 2.406 2 2 0 0 0 2.47.047L41 118.777l22.926 17.192a2.006 2.006 0 0 0 3.215-1.606c0-.289-.059-.574-.184-.843L42.824 81.234A2.01 2.01 0 0 0 41 80.063c-.785 0-1.496.457-1.828 1.167" />
        </G>
      </G>
    </Svg>
  )
}
