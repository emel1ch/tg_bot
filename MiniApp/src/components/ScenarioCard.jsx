import React from 'react'

export default function ScenarioCard({
  icon,
  iconWrapClassName = '',
  iconWrapStyle = {},
  iconBoxClassName = '',
  iconBoxStyle = {},

  title,
  subtitle,
  materialsText,

  titleClassName = '',
  titleStyle = {},
  titleWrapClassName = '',
  titleWrapStyle = {},

  subtitleClassName = '',
  subtitleStyle = {},
  subtitleWrapClassName = '',
  subtitleWrapStyle = {},

  materialsClassName = '',
  materialsStyle = {},
  materialsWrapClassName = '',
  materialsWrapStyle = {},

  footerLeft,
  footerLeftClassName = '',
  footerLeftStyle = {},
  footerLeftWrapClassName = '',
  footerLeftWrapStyle = {},

  footerRightLabel,
  footerRightIcon,
  footerRightClassName = '',
  footerRightStyle = {},
  footerRightWrapClassName = '',
  footerRightWrapStyle = {},

  onClick,
  width = 440,
  height = 270,
  cardClassName = '',
  cardStyle = {},
}) {
  return (
    <div
      className={`shrink-0 overflow-hidden rounded-[18px] bg-white p-5 shadow-[0_6px_24px_rgba(15,23,42,0.07)] ring-1 ring-slate-100 ${cardClassName}`}
      style={{
        width: `min(${width}px, 100%)`,
        height: `${height}px`,
        ...cardStyle,
      }}
    >
      <div className="flex h-full flex-col">
        <div
          className={`relative inline-flex self-start ${iconWrapClassName}`}
          style={iconWrapStyle}
        >
          <div
            className={`flex items-center justify-center ${iconBoxClassName}`}
            style={iconBoxStyle}
          >
            {icon}
          </div>
        </div>

        <div
          className={`relative inline-block mt-4 ${titleWrapClassName}`}
          style={titleWrapStyle}
        >
          <div
            className={`text-left text-[19px] font-semibold leading-6 text-[#111827] ${titleClassName}`}
            style={titleStyle}
          >
            {title}
          </div>
        </div>

        <div
          className={`relative inline-block mt-2 ${subtitleWrapClassName}`}
          style={subtitleWrapStyle}
        >
          <div
            className={`text-left text-[14.5px] leading-6 text-[#6B7280] ${subtitleClassName}`}
            style={subtitleStyle}
          >
            {subtitle}
          </div>
        </div>

        <div
          className={`relative inline-block mt-2 ${materialsWrapClassName}`}
          style={materialsWrapStyle}
        >
          <div
            className={`text-left text-[13px] text-[#9CA3AF] ${materialsClassName}`}
            style={materialsStyle}
          >
            {materialsText}
          </div>
        </div>

        <div className="mt-auto pt-5">
          <div className="flex items-end justify-between gap-4">
            <div
              className={`relative inline-flex ${footerLeftWrapClassName}`}
              style={footerLeftWrapStyle}
            >
              <div className={footerLeftClassName} style={footerLeftStyle}>
                {footerLeft}
              </div>
            </div>

            <div
              className={`relative inline-flex ${footerRightWrapClassName}`}
              style={footerRightWrapStyle}
            >
              <button
                type="button"
                onClick={() => onClick?.()}
                className={`${footerRightClassName} cursor-pointer`}
                style={footerRightStyle}
              >
                {footerRightIcon}
                {footerRightLabel}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}