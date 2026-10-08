Add-Type -AssemblyName System.Drawing

$repo = Split-Path $PSScriptRoot -Parent
$output = Join-Path $repo 'assets/og-learning-speed-distance-time.png'
$bitmap = [System.Drawing.Bitmap]::new(1200, 630)
$graphics = [System.Drawing.Graphics]::FromImage($bitmap)
$graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
$graphics.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::AntiAliasGridFit
$graphics.Clear([System.Drawing.ColorTranslator]::FromHtml('#08101d'))

function Color([string]$hex) { [System.Drawing.ColorTranslator]::FromHtml($hex) }
function Brush([string]$hex) { [System.Drawing.SolidBrush]::new((Color $hex)) }
function RoundedRect([int]$x, [int]$y, [int]$width, [int]$height, [int]$radius, [string]$fill, [string]$stroke) {
  $path = [System.Drawing.Drawing2D.GraphicsPath]::new()
  $diameter = $radius * 2
  $path.AddArc($x, $y, $diameter, $diameter, 180, 90)
  $path.AddArc($x + $width - $diameter, $y, $diameter, $diameter, 270, 90)
  $path.AddArc($x + $width - $diameter, $y + $height - $diameter, $diameter, $diameter, 0, 90)
  $path.AddArc($x, $y + $height - $diameter, $diameter, $diameter, 90, 90)
  $path.CloseFigure()
  $graphics.FillPath((Brush $fill), $path)
  if ($stroke) { $graphics.DrawPath([System.Drawing.Pen]::new((Color $stroke), 2), $path) }
  $path.Dispose()
}
function Text([string]$value, [single]$x, [single]$y, [single]$size, [string]$hex, [bool]$bold = $false, [string]$align = 'Near') {
  $style = if ($bold) { [System.Drawing.FontStyle]::Bold } else { [System.Drawing.FontStyle]::Regular }
  $font = [System.Drawing.Font]::new('Yu Gothic UI', $size, $style, [System.Drawing.GraphicsUnit]::Pixel)
  $format = [System.Drawing.StringFormat]::new()
  $format.Alignment = [System.Drawing.StringAlignment]::$align
  $format.LineAlignment = [System.Drawing.StringAlignment]::Near
  $graphics.DrawString($value, $font, (Brush $hex), $x, $y, $format)
  $font.Dispose(); $format.Dispose()
}
function Line([single]$x1, [single]$y1, [single]$x2, [single]$y2, [string]$hex, [single]$width = 1, [single]$alpha = 255) {
  $color = [System.Drawing.Color]::FromArgb([int]$alpha, (Color $hex))
  $graphics.DrawLine([System.Drawing.Pen]::new($color, $width), $x1, $y1, $x2, $y2)
}

try {
  $background = [System.Drawing.Drawing2D.LinearGradientBrush]::new([System.Drawing.Rectangle]::new(0, 0, 1200, 630), (Color '#08101d'), (Color '#11233b'), 35)
  $graphics.FillRectangle($background, 0, 0, 1200, 630)
  $graphics.FillEllipse((Brush '#10253a'), 930, -118, 360, 360)
  $graphics.FillEllipse((Brush '#171f30'), -73, 500, 330, 330)

  Text '助手A' 72 44 27 '#eff6ff' $true
  Text 'LEARNING' 157 51 16 '#7dd3fc' $true
  Line 72 98 537 98 '#334155' 2

  Text '速さ・距離・' 72 120 57 '#eff6ff' $true
  Text '時間' 72 187 57 '#eff6ff' $true
  Text '動きを見て、距離の変化をグラフでつかもう。' 74 271 21 '#cbd5e1'

  RoundedRect 72 340 490 91 18 '#172942' '#334155'
  Text '速さ × 時間 ＝ 距離' 96 350 15 '#b7c5d7' $true
  Text '5 m/秒' 96 379 27 '#fbbf24' $true
  Text '×' 222 380 25 '#94a3b8'
  Text '10 秒' 257 379 27 '#7dd3fc' $true
  Text '＝' 364 380 25 '#94a3b8'
  Text '50 m' 411 379 27 '#fbbf24' $true

  RoundedRect 72 454 490 112 18 '#111d30' '#334155'
  Text '車の動き' 96 461 15 '#b7c5d7' $true
  RoundedRect 96 496 438 42 9 '#334155' ''
  $road = [System.Drawing.Pen]::new((Color '#cbd5e1'), 2)
  $road.DashPattern = [single[]]@(10, 9)
  $graphics.DrawLine($road, 108, 517, 520, 517)
  Line 110 546 490 546 '#38bdf8' 3 220
  RoundedRect 474 506 40 21 6 '#38bdf8' '#e0f2fe'
  RoundedRect 481 509 22 8 3 '#075985' ''
  $graphics.FillEllipse((Brush '#0b1220'), 478, 524, 11, 11)
  $graphics.FillEllipse((Brush '#0b1220'), 501, 524, 11, 11)
  $graphics.DrawEllipse([System.Drawing.Pen]::new((Color '#cbd5e1'), 2), 478, 524, 11, 11)
  $graphics.DrawEllipse([System.Drawing.Pen]::new((Color '#cbd5e1'), 2), 501, 524, 11, 11)
  Text '0 m' 96 540 12 '#cbd5e1'
  Text '50 m' 534 540 12 '#cbd5e1' $false 'Far'

  RoundedRect 604 98 524 468 23 '#172942' '#334155'
  Text '時間と距離のグラフ' 642 115 22 '#eff6ff' $true
  Text '速さが一定なら、距離はまっすぐ増える' 642 151 14 '#b7c5d7'

  $plotLeft = 704; $plotTop = 220; $plotRight = 1069; $plotBottom = 490
  for ($i = 0; $i -le 5; $i++) {
    $x = $plotLeft + 73 * $i
    $y = $plotBottom - 54 * $i
    Line $x $plotTop $x $plotBottom '#94a3b8' 1 61
    Line $plotLeft $y $plotRight $y '#94a3b8' 1 61
    Text ([string]($i * 2)) $x 496 13 '#b7c5d7' $false 'Center'
    Text ([string]($i * 10)) 692 ($y - 7) 13 '#b7c5d7' $false 'Far'
  }
  Line $plotLeft $plotTop $plotLeft $plotBottom '#cbd5e1' 2
  Line $plotLeft $plotBottom $plotRight $plotBottom '#cbd5e1' 2
  Line $plotLeft $plotBottom $plotRight $plotTop '#38bdf8' 5
  $graphics.FillEllipse((Brush '#fbbf24'), 1060, 211, 18, 18)
  $graphics.DrawEllipse([System.Drawing.Pen]::new((Color '#ffffff'), 3), 1060, 211, 18, 18)
  Text '50m' 1087 202 15 '#fbbf24' $true
  Text '時間（秒）' 1070 529 14 '#cbd5e1' $false 'Far'
  Text '距離（m）' 642 198 14 '#cbd5e1'

  $bitmap.Save($output, [System.Drawing.Imaging.ImageFormat]::Png)
} finally {
  $graphics.Dispose()
  $bitmap.Dispose()
}
