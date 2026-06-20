import re

filepath = 'src/app/components/LevelBlends.tsx'

with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

old_buttons = '''              <div className="flex justify-between items-center gap-4 mt-6">
                <Button
                  variant="outline"
                  size="lg"
                  disabled={reviewIdx === 0}
                  onClick={() => setReviewIdx((prev) => Math.max(prev - 1, 0))}
                  className="rounded-2xl flex-1 py-6 border-2 font-bold max-w-[200px] bg-background text-foreground hover:bg-accent hover:text-accent-foreground dark:bg-input/30 dark:border-input dark:hover:bg-input/50"
                >
                  <ArrowLeft className="w-5 h-5 mr-2" /> Back
                </Button>
                <Button
                  size="lg"
                  onClick={() => setCurrentPhase("patterns")}
                  className="rounded-2xl flex-1 py-6 font-bold text-white shadow-lg animate-pulse bg-primary hover:bg-primary/90"
                  style={{ background: `linear-gradient(135deg, ${accent.primary}, ${accent.dark})` }}
                >
                  Start Pattern Quiz! <ArrowRight className="w-5 h-5 ml-2" />
                </Button>
              </div>'''

# First, remove the old buttons
content = content.replace(old_buttons, '')

# Now, insert the new buttons below the paragraph
old_header = '''              <div className="text-center mb-8">

                <p className="text-gray-500 dark:text-gray-400 text-sm">
                  Review the patterns. Tap any word or heading to hear it spoken!
                </p>
              </div>'''

new_header = '''              <div className="text-center mb-8">

                <p className="text-gray-500 dark:text-gray-400 text-sm">
                  Review the patterns. Tap any word or heading to hear it spoken!
                </p>
                <div className="flex justify-center items-center w-full gap-3 sm:gap-4 max-w-sm mx-auto mt-6">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={reviewIdx === 0}
                    onClick={() => setReviewIdx((prev) => Math.max(prev - 1, 0))}
                    className="flex-1 rounded-xl font-bold text-white shadow-md border-b-[4px] border-[#086ca5] hover:scale-105 active:scale-95 px-2 transition-all h-9 py-2 disabled:opacity-50 disabled:grayscale disabled:pointer-events-none"
                    style={{
                      background: "linear-gradient(135deg, rgb(28, 176, 246) 0%, rgb(10, 142, 212) 100%)",
                    }}
                  >
                    <ArrowLeft className="w-4 h-4 mr-1" /> Back
                  </Button>
                  {reviewIdx < filteredData.length - 1 ? (
                    <Button
                      size="sm"
                      onClick={() => setReviewIdx((prev) => Math.min(prev + 1, filteredData.length - 1))}
                      className="flex-1 rounded-xl font-bold text-white shadow-md border-b-[4px] border-[#3c8c01] hover:scale-105 active:scale-95 px-2 transition-all h-9 py-2"
                      style={{
                        background: "linear-gradient(135deg, rgb(88, 204, 2) 0%, rgb(70, 163, 2) 100%)",
                      }}
                    >
                      Next <ArrowRight className="w-4 h-4 ml-1" />
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      onClick={() => setCurrentPhase("patterns")}
                      className="flex-1 rounded-xl font-bold text-white shadow-md border-b-[4px] border-[#3c8c01] hover:scale-105 active:scale-95 px-2 transition-all h-9 py-2"
                      style={{
                        background: "linear-gradient(135deg, rgb(88, 204, 2) 0%, rgb(70, 163, 2) 100%)",
                      }}
                    >
                      Proceed <ArrowRight className="w-4 h-4 ml-1" />
                    </Button>
                  )}
                </div>
              </div>'''

content = content.replace(old_header, new_header)

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)

print("Replaced buttons.")
