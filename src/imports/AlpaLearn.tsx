import clsx from "clsx";
import svgPaths from "./svg-cha2vybwng";
type ContainerBackgroundImage5Props = {
  additionalClassNames?: string;
};

function ContainerBackgroundImage5({ children, additionalClassNames = "" }: React.PropsWithChildren<ContainerBackgroundImage5Props>) {
  return (
    <div style={{ backgroundImage: "linear-gradient(135deg, rgb(173, 70, 255) 0%, rgb(246, 51, 154) 100%)" }} className={clsx("relative shrink-0", additionalClassNames)}>
      {children}
    </div>
  );
}

function ContainerBackgroundImage4({ children }: React.PropsWithChildren<{}>) {
  return (
    <div className="h-[224px] relative shrink-0 w-full">
      <div className="content-stretch flex flex-col gap-[16px] items-start pt-[24px] px-[24px] relative size-full">{children}</div>
    </div>
  );
}
type ContainerBackgroundImage3Props = {
  additionalClassNames?: string;
};

function ContainerBackgroundImage3({ children, additionalClassNames = "" }: React.PropsWithChildren<ContainerBackgroundImage3Props>) {
  return (
    <div className={clsx("h-[48px] relative shrink-0", additionalClassNames)}>
      <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex flex-col items-start relative size-full">{children}</div>
    </div>
  );
}
type ContainerBackgroundImage2Props = {
  additionalClassNames?: string;
};

function ContainerBackgroundImage2({ children, additionalClassNames = "" }: React.PropsWithChildren<ContainerBackgroundImage2Props>) {
  return (
    <div className={clsx("relative shrink-0", additionalClassNames)}>
      <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex gap-[12px] items-center relative size-full">{children}</div>
    </div>
  );
}

function BackgroundImage1({ children }: React.PropsWithChildren<{}>) {
  return (
    <div className="overflow-clip rounded-[inherit] size-full">
      <div className="content-stretch flex flex-col items-start p-[4px] relative size-full">{children}</div>
    </div>
  );
}

function ContainerBackgroundImage1({ children }: React.PropsWithChildren<{}>) {
  return (
    <div className="bg-white h-[232px] opacity-60 relative rounded-[24px] shrink-0 w-full">
      <BackgroundImage1>{children}</BackgroundImage1>
      <div aria-hidden="true" className="absolute border-4 border-[#e5e7eb] border-solid inset-0 pointer-events-none rounded-[24px] shadow-[0px_10px_15px_-3px_rgba(0,0,0,0.1),0px_4px_6px_-4px_rgba(0,0,0,0.1)]" />
    </div>
  );
}

function BackgroundImage({ children }: React.PropsWithChildren<{}>) {
  return (
    <div className="relative shrink-0 size-[24px]">
      <svg className="absolute block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 24 24">
        <g id="Icon">{children}</g>
      </svg>
    </div>
  );
}
type ButtonBackgroundImageAndTextProps = {
  text: string;
};

function ButtonBackgroundImageAndText({ text }: ButtonBackgroundImageAndTextProps) {
  return (
    <div className="bg-[#eceef2] h-[48px] opacity-50 relative rounded-[16px] shrink-0 w-full">
      <div className="absolute left-[242px] size-[16px] top-[16px]">
        <svg className="absolute block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 16 16">
          <g id="Icon">
            <path d={svgPaths.p18f7f580} id="Vector" stroke="var(--stroke-0, #030213)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.33333" />
            <path d={svgPaths.p4317f80} id="Vector_2" stroke="var(--stroke-0, #030213)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.33333" />
          </g>
        </svg>
      </div>
      <p className="-translate-x-1/2 absolute font-['Segoe_UI_Emoji:Bold',sans-serif] leading-[28px] left-[420.5px] not-italic text-[#030213] text-[18px] text-center top-[8.6px]">{text}</p>
    </div>
  );
}
type ContainerBackgroundImageAndText1Props = {
  text: string;
  additionalClassNames?: string;
};

function ContainerBackgroundImageAndText1({ text, additionalClassNames = "" }: ContainerBackgroundImageAndText1Props) {
  return (
    <div className={clsx("absolute bg-[#f3f4f6] content-stretch flex items-center justify-center rounded-[10px] size-[40px] top-0", additionalClassNames)}>
      <p className="font-['Segoe_UI_Emoji:Bold',sans-serif] leading-[20px] not-italic relative shrink-0 text-[#99a1af] text-[14px]">{text}</p>
    </div>
  );
}

function ContainerBackgroundImage() {
  return (
    <div className="bg-[#d1d5dc] relative rounded-[26843500px] shrink-0 size-[48px]">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex items-center justify-center relative size-full">
        <BackgroundImage>
          <path d={svgPaths.p2dfab7c0} id="Vector" stroke="var(--stroke-0, white)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
          <path d={svgPaths.p2c300c0} id="Vector_2" stroke="var(--stroke-0, white)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
        </BackgroundImage>
      </div>
    </div>
  );
}
type ContainerBackgroundImageAndTextProps = {
  text: string;
  additionalClassNames?: string;
};

function ContainerBackgroundImageAndText({ text, additionalClassNames = "" }: ContainerBackgroundImageAndTextProps) {
  return (
    <div style={{ backgroundImage: "linear-gradient(135deg, rgb(243, 232, 255) 0%, rgb(252, 231, 243) 100%)" }} className={clsx("absolute content-stretch flex items-center justify-center rounded-[10px] size-[40px] top-0", additionalClassNames)}>
      <p className="font-['Segoe_UI_Emoji:Bold',sans-serif] leading-[20px] not-italic relative shrink-0 text-[#9810fa] text-[14px]">{text}</p>
    </div>
  );
}
type ParagraphBackgroundImageAndTextProps = {
  text: string;
};

function ParagraphBackgroundImageAndText({ text }: ParagraphBackgroundImageAndTextProps) {
  return (
    <div className="content-stretch flex h-[20px] items-start relative shrink-0 w-full">
      <p className="flex-[1_0_0] font-['Segoe_UI_Emoji:Regular',sans-serif] leading-[20px] min-h-px min-w-px not-italic relative text-[#6a7282] text-[14px] whitespace-pre-wrap">{text}</p>
    </div>
  );
}
type HeadingBackgroundImageAndTextProps = {
  text: string;
};

function HeadingBackgroundImageAndText({ text }: HeadingBackgroundImageAndTextProps) {
  return (
    <div className="content-stretch flex h-[28px] items-start relative shrink-0 w-full">
      <p className="font-['Segoe_UI_Emoji:Bold',sans-serif] leading-[28px] not-italic relative shrink-0 text-[#1e2939] text-[20px]">{text}</p>
    </div>
  );
}

export default function AlpaLearn() {
  return (
    <div className="content-stretch flex flex-col items-start px-[312.4px] relative size-full" data-name="AlpaLearn" style={{ backgroundImage: "linear-gradient(133.407deg, rgb(250, 245, 255) 0%, rgb(253, 242, 248) 50%, rgb(239, 246, 255) 100%), linear-gradient(90deg, rgb(255, 255, 255) 0%, rgb(255, 255, 255) 100%)" }}>
      <div className="h-[1608px] relative shrink-0 w-full" data-name="Container">
        <div className="absolute content-stretch flex flex-col gap-[16px] h-[100px] items-start left-[16px] top-[32px] w-[864px]" data-name="Header">
          <div className="h-[56px] relative shrink-0 w-full" data-name="Container">
            <div className="flex flex-row items-center justify-center size-full">
              <div className="content-stretch flex gap-[12px] items-center justify-center relative size-full">
                <ContainerBackgroundImage5 additionalClassNames="rounded-[16px] shadow-[0px_10px_15px_0px_rgba(0,0,0,0.1),0px_4px_6px_0px_rgba(0,0,0,0.1)] size-[56px]">
                  <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex flex-col items-start pt-[12px] px-[12px] relative size-full">
                    <div className="h-[32px] overflow-clip relative shrink-0 w-full" data-name="Icon">
                      <div className="absolute inset-[8.33%_8.33%_12.2%_8.33%]" data-name="Vector">
                        <div className="absolute inset-[-5.24%_-5%]">
                          <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 29.3357 28.0961">
                            <path d={svgPaths.p1343a100} fill="var(--fill-0, white)" id="Vector" stroke="var(--stroke-0, white)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.66667" />
                          </svg>
                        </div>
                      </div>
                    </div>
                  </div>
                </ContainerBackgroundImage5>
                <div className="h-[40px] relative shrink-0 w-[192px]" data-name="Heading 1">
                  <div className="bg-clip-padding border-0 border-[transparent] border-solid relative size-full">
                    <p className="-translate-x-1/2 absolute bg-clip-text font-['Segoe_UI_Emoji:Bold',sans-serif] leading-[40px] left-[96.5px] not-italic text-[36px] text-[transparent] text-center top-[-3.8px]" style={{ backgroundImage: "linear-gradient(90deg, rgba(0, 0, 0, 0) 0%, rgba(0, 0, 0, 0) 100%), linear-gradient(90deg, rgb(152, 16, 250) 0%, rgb(230, 0, 118) 100%)", WebkitTextFillColor: "transparent" }}>
                      AlphaLearn
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div className="h-[28px] relative shrink-0 w-full" data-name="Paragraph">
            <p className="-translate-x-1/2 absolute font-['Segoe_UI_Emoji:Regular',sans-serif] leading-[28px] left-[432.9px] not-italic text-[#4a5565] text-[18px] text-center top-[-1.4px]">Master the alphabet through fun and interactive lessons!</p>
          </div>
        </div>
        <div className="absolute bg-white content-stretch flex flex-col gap-[16px] h-[108px] items-start left-[16px] pb-[4px] pt-[28px] px-[28px] rounded-[24px] top-[180px] w-[864px]" data-name="Container">
          <div aria-hidden="true" className="absolute border-4 border-[#f3e8ff] border-solid inset-0 pointer-events-none rounded-[24px] shadow-[0px_20px_25px_0px_rgba(0,0,0,0.1),0px_8px_10px_0px_rgba(0,0,0,0.1)]" />
          <div className="content-stretch flex h-[24px] items-center justify-between relative shrink-0 w-full" data-name="Container">
            <ContainerBackgroundImage2 additionalClassNames="h-[24px] w-[136.8px]">
              <BackgroundImage>
                <path d={svgPaths.p3f521e00} id="Vector" stroke="var(--stroke-0, #F0B100)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
                <path d={svgPaths.p203c5100} id="Vector_2" stroke="var(--stroke-0, #F0B100)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
                <path d="M4 22H20" id="Vector_3" stroke="var(--stroke-0, #F0B100)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
                <path d={svgPaths.p20590f00} id="Vector_4" stroke="var(--stroke-0, #F0B100)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
                <path d={svgPaths.p74ec0e0} id="Vector_5" stroke="var(--stroke-0, #F0B100)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
                <path d={svgPaths.p374bec80} id="Vector_6" stroke="var(--stroke-0, #F0B100)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
              </BackgroundImage>
              <div className="flex-[1_0_0] h-[24px] min-h-px min-w-px relative" data-name="Text">
                <div className="bg-clip-padding border-0 border-[transparent] border-solid relative size-full">
                  <p className="absolute font-['Segoe_UI_Emoji:Semi_Bold',sans-serif] leading-[24px] left-0 not-italic text-[#364153] text-[16px] top-[-2.2px]">Your Progress</p>
                </div>
              </div>
            </ContainerBackgroundImage2>
            <div className="h-[20px] relative shrink-0 w-[76px]" data-name="Text">
              <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex items-start relative size-full">
                <p className="font-['Segoe_UI_Emoji:Bold',sans-serif] leading-[20px] not-italic relative shrink-0 text-[#9810fa] text-[14px]">0 / 5 Levels</p>
              </div>
            </div>
          </div>
          <div className="bg-[rgba(3,2,19,0.2)] content-stretch flex flex-col h-[12px] items-start overflow-clip pl-[-808px] pr-[808px] relative rounded-[26843500px] shrink-0 w-full" data-name="Primitive.div">
            <div className="bg-[#030213] h-[12px] shrink-0 w-full" data-name="Container" />
          </div>
        </div>
        <div className="absolute content-stretch flex flex-col gap-[24px] h-[1256px] items-start left-[16px] top-[320px] w-[864px]" data-name="Container">
          <div className="bg-white h-[232px] relative rounded-[24px] shrink-0 w-full" data-name="Container">
            <BackgroundImage1>
              <ContainerBackgroundImage4>
                <div className="content-stretch flex h-[56px] items-start justify-between relative shrink-0 w-full" data-name="Container">
                  <ContainerBackgroundImage2 additionalClassNames="h-[48px] w-[808px]">
                    <ContainerBackgroundImage5 additionalClassNames="rounded-[26843500px] size-[48px]">
                      <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex items-center justify-center relative size-full">
                        <p className="font-['Segoe_UI_Emoji:Bold',sans-serif] leading-[28px] not-italic relative shrink-0 text-[20px] text-white">1</p>
                      </div>
                    </ContainerBackgroundImage5>
                    <ContainerBackgroundImage3 additionalClassNames="w-[110.4px]">
                      <HeadingBackgroundImageAndText text="Level 1: A-E" />
                      <ParagraphBackgroundImageAndText text="5 letters to learn" />
                    </ContainerBackgroundImage3>
                  </ContainerBackgroundImage2>
                </div>
                <div className="h-[40px] relative shrink-0 w-full" data-name="Container">
                  <ContainerBackgroundImageAndText text="A" additionalClassNames="left-0" />
                  <ContainerBackgroundImageAndText text="B" additionalClassNames="left-[48px]" />
                  <ContainerBackgroundImageAndText text="C" additionalClassNames="left-[96px]" />
                  <ContainerBackgroundImageAndText text="D" additionalClassNames="left-[144px]" />
                  <ContainerBackgroundImageAndText text="E" additionalClassNames="left-[192px]" />
                </div>
                <div className="bg-gradient-to-r from-[#ad46ff] h-[48px] relative rounded-[16px] shrink-0 to-[#f6339a] w-full" data-name="Link">
                  <p className="-translate-x-1/2 absolute font-['Segoe_UI_Emoji:Bold',sans-serif] leading-[28px] left-[404.7px] not-italic text-[18px] text-center text-white top-[8.6px]">Start Learning</p>
                </div>
              </ContainerBackgroundImage4>
            </BackgroundImage1>
            <div aria-hidden="true" className="absolute border-4 border-[#dab2ff] border-solid inset-0 pointer-events-none rounded-[24px] shadow-[0px_10px_15px_-3px_rgba(0,0,0,0.1),0px_4px_6px_-4px_rgba(0,0,0,0.1)]" />
          </div>
          <ContainerBackgroundImage1>
            <ContainerBackgroundImage4>
              <div className="content-stretch flex h-[56px] items-start justify-between relative shrink-0 w-full" data-name="Container">
                <ContainerBackgroundImage2 additionalClassNames="h-[48px] w-[808px]">
                  <ContainerBackgroundImage />
                  <ContainerBackgroundImage3 additionalClassNames="w-[104.8px]">
                    <HeadingBackgroundImageAndText text="Level 2: F-J" />
                    <div className="content-stretch flex h-[20px] items-start relative shrink-0 w-full" data-name="Paragraph">
                      <p className="font-['Segoe_UI_Emoji:Regular',sans-serif] leading-[20px] not-italic relative shrink-0 text-[#6a7282] text-[14px]">5 letters to learn</p>
                    </div>
                  </ContainerBackgroundImage3>
                </ContainerBackgroundImage2>
              </div>
              <div className="h-[40px] relative shrink-0 w-full" data-name="Container">
                <ContainerBackgroundImageAndText1 text="F" additionalClassNames="left-0" />
                <ContainerBackgroundImageAndText1 text="G" additionalClassNames="left-[48px]" />
                <ContainerBackgroundImageAndText1 text="H" additionalClassNames="left-[96px]" />
                <ContainerBackgroundImageAndText1 text="I" additionalClassNames="left-[144px]" />
                <ContainerBackgroundImageAndText1 text="J" additionalClassNames="left-[192px]" />
              </div>
              <ButtonBackgroundImageAndText text="Complete previous level to unlock" />
            </ContainerBackgroundImage4>
          </ContainerBackgroundImage1>
          <ContainerBackgroundImage1>
            <ContainerBackgroundImage4>
              <div className="content-stretch flex h-[56px] items-start justify-between relative shrink-0 w-full" data-name="Container">
                <ContainerBackgroundImage2 additionalClassNames="h-[48px] w-[808px]">
                  <ContainerBackgroundImage />
                  <ContainerBackgroundImage3 additionalClassNames="w-[113.6px]">
                    <HeadingBackgroundImageAndText text="Level 3: K-O" />
                    <ParagraphBackgroundImageAndText text="5 letters to learn" />
                  </ContainerBackgroundImage3>
                </ContainerBackgroundImage2>
              </div>
              <div className="h-[40px] relative shrink-0 w-full" data-name="Container">
                <ContainerBackgroundImageAndText1 text="K" additionalClassNames="left-0" />
                <ContainerBackgroundImageAndText1 text="L" additionalClassNames="left-[48px]" />
                <ContainerBackgroundImageAndText1 text="M" additionalClassNames="left-[96px]" />
                <ContainerBackgroundImageAndText1 text="N" additionalClassNames="left-[144px]" />
                <ContainerBackgroundImageAndText1 text="O" additionalClassNames="left-[192px]" />
              </div>
              <ButtonBackgroundImageAndText text="Complete previous level to unlock" />
            </ContainerBackgroundImage4>
          </ContainerBackgroundImage1>
          <ContainerBackgroundImage1>
            <ContainerBackgroundImage4>
              <div className="content-stretch flex h-[56px] items-start justify-between relative shrink-0 w-full" data-name="Container">
                <ContainerBackgroundImage2 additionalClassNames="h-[48px] w-[808px]">
                  <ContainerBackgroundImage />
                  <ContainerBackgroundImage3 additionalClassNames="w-[109.6px]">
                    <HeadingBackgroundImageAndText text="Level 4: P-T" />
                    <ParagraphBackgroundImageAndText text="5 letters to learn" />
                  </ContainerBackgroundImage3>
                </ContainerBackgroundImage2>
              </div>
              <div className="h-[40px] relative shrink-0 w-full" data-name="Container">
                <ContainerBackgroundImageAndText1 text="P" additionalClassNames="left-0" />
                <ContainerBackgroundImageAndText1 text="Q" additionalClassNames="left-[48px]" />
                <ContainerBackgroundImageAndText1 text="R" additionalClassNames="left-[96px]" />
                <ContainerBackgroundImageAndText1 text="S" additionalClassNames="left-[144px]" />
                <ContainerBackgroundImageAndText1 text="T" additionalClassNames="left-[192px]" />
              </div>
              <ButtonBackgroundImageAndText text="Complete previous level to unlock" />
            </ContainerBackgroundImage4>
          </ContainerBackgroundImage1>
          <ContainerBackgroundImage1>
            <ContainerBackgroundImage4>
              <div className="content-stretch flex h-[56px] items-start justify-between relative shrink-0 w-full" data-name="Container">
                <ContainerBackgroundImage2 additionalClassNames="h-[48px] w-[808px]">
                  <ContainerBackgroundImage />
                  <ContainerBackgroundImage3 additionalClassNames="w-[112px]">
                    <HeadingBackgroundImageAndText text="Level 5: U-Z" />
                    <ParagraphBackgroundImageAndText text="6 letters to learn" />
                  </ContainerBackgroundImage3>
                </ContainerBackgroundImage2>
              </div>
              <div className="h-[40px] relative shrink-0 w-full" data-name="Container">
                <ContainerBackgroundImageAndText1 text="U" additionalClassNames="left-0" />
                <ContainerBackgroundImageAndText1 text="V" additionalClassNames="left-[48px]" />
                <ContainerBackgroundImageAndText1 text="W" additionalClassNames="left-[96px]" />
                <ContainerBackgroundImageAndText1 text="X" additionalClassNames="left-[144px]" />
                <ContainerBackgroundImageAndText1 text="Y" additionalClassNames="left-[192px]" />
                <ContainerBackgroundImageAndText1 text="Z" additionalClassNames="left-[240px]" />
              </div>
              <ButtonBackgroundImageAndText text="Complete previous level to unlock" />
            </ContainerBackgroundImage4>
          </ContainerBackgroundImage1>
        </div>
      </div>
    </div>
  );
}