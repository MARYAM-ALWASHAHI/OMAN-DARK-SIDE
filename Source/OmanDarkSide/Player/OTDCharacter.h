#pragma once

#include "CoreMinimal.h"
#include "GameFramework/Character.h"
#include "OTDCharacter.generated.h"

class UCameraComponent;
class USpringArmComponent;
class UStaticMeshComponent;
class UInputAction;
class UInputMappingContext;
struct FInputActionValue;

UENUM(BlueprintType)
enum class EOTDCameraMode : uint8
{
	ThirdPerson,
	FirstPerson
};

/**
 * Player character for the vertical slice (Milestone 1).
 *
 * Provides: walk / sprint, mouse look, jump, and first/third-person camera switching.
 * Input: if no Input Action assets are assigned in a Blueprint subclass, a default
 * keyboard+mouse mapping is created at runtime so the prototype works with zero editor assets.
 * Body: a placeholder cylinder until a real character mesh exists (out of scope for M1).
 */
UCLASS()
class OMANDARKSIDE_API AOTDCharacter : public ACharacter
{
	GENERATED_BODY()

public:
	AOTDCharacter();

	UFUNCTION(BlueprintCallable, Category = "OTD|Camera")
	void SetCameraMode(EOTDCameraMode NewMode);

	UFUNCTION(BlueprintPure, Category = "OTD|Camera")
	EOTDCameraMode GetCameraMode() const { return CameraMode; }

	UFUNCTION(BlueprintCallable, Category = "OTD|Camera")
	void ToggleCameraMode();

	UFUNCTION(BlueprintPure, Category = "OTD|Movement")
	bool IsSprinting() const { return bIsSprinting; }

	UFUNCTION(BlueprintCallable, Category = "OTD|Movement")
	void SetSprinting(bool bNewSprinting);

	/** Used by the touch RUN button (holding a button while steering is awkward on a phone). */
	UFUNCTION(BlueprintCallable, Category = "OTD|Movement")
	void ToggleSprint() { SetSprinting(!bIsSprinting); }

protected:
	virtual void BeginPlay() override;
	virtual void EndPlay(const EEndPlayReason::Type EndPlayReason) override;
	virtual void PawnClientRestart() override;
	virtual void SetupPlayerInputComponent(UInputComponent* PlayerInputComponent) override;

	// --- Components ---
	UPROPERTY(VisibleAnywhere, BlueprintReadOnly, Category = "OTD|Camera")
	TObjectPtr<USpringArmComponent> CameraBoom;

	UPROPERTY(VisibleAnywhere, BlueprintReadOnly, Category = "OTD|Camera")
	TObjectPtr<UCameraComponent> ThirdPersonCamera;

	UPROPERTY(VisibleAnywhere, BlueprintReadOnly, Category = "OTD|Camera")
	TObjectPtr<UCameraComponent> FirstPersonCamera;

	/** Temporary visible body. Replace with a skeletal mesh in a later milestone. */
	UPROPERTY(VisibleAnywhere, BlueprintReadOnly, Category = "OTD|Placeholder")
	TObjectPtr<UStaticMeshComponent> PlaceholderBody;

	// --- Tuning (data, not code: override in a Blueprint subclass) ---
	UPROPERTY(EditDefaultsOnly, BlueprintReadOnly, Category = "OTD|Movement", meta = (ClampMin = "50"))
	float WalkSpeed = 300.f;

	UPROPERTY(EditDefaultsOnly, BlueprintReadOnly, Category = "OTD|Movement", meta = (ClampMin = "50"))
	float SprintSpeed = 600.f;

	UPROPERTY(EditDefaultsOnly, BlueprintReadOnly, Category = "OTD|Camera")
	EOTDCameraMode StartingCameraMode = EOTDCameraMode::ThirdPerson;

	UPROPERTY(EditDefaultsOnly, BlueprintReadOnly, Category = "OTD|Camera")
	float ThirdPersonArmLength = 300.f;

	UPROPERTY(EditDefaultsOnly, BlueprintReadOnly, Category = "OTD|Camera")
	float FirstPersonEyeHeight = 64.f;

	/** Print camera/sprint state changes on screen (useful for M1 testing). */
	UPROPERTY(EditDefaultsOnly, Category = "OTD|Debug")
	bool bShowDebugMessages = true;

	// --- Mobile (phone / iPad) ---
	/** Show on-screen JUMP / RUN / CAMERA buttons on touch devices. */
	UPROPERTY(EditDefaultsOnly, Category = "OTD|Mobile")
	bool bEnableTouchControls = true;

	/** Also show the touch buttons on PC (to test in PIE with "Use Mouse for Touch"). */
	UPROPERTY(EditDefaultsOnly, Category = "OTD|Mobile")
	bool bForceTouchControls = false;

	// --- Input (optional assets; runtime defaults are built if any are left empty) ---
	UPROPERTY(EditDefaultsOnly, Category = "OTD|Input")
	TObjectPtr<UInputMappingContext> DefaultMappingContext;

	UPROPERTY(EditDefaultsOnly, Category = "OTD|Input")
	TObjectPtr<UInputAction> MoveAction;

	UPROPERTY(EditDefaultsOnly, Category = "OTD|Input")
	TObjectPtr<UInputAction> LookAction;

	UPROPERTY(EditDefaultsOnly, Category = "OTD|Input")
	TObjectPtr<UInputAction> JumpAction;

	UPROPERTY(EditDefaultsOnly, Category = "OTD|Input")
	TObjectPtr<UInputAction> SprintAction;

	UPROPERTY(EditDefaultsOnly, Category = "OTD|Input")
	TObjectPtr<UInputAction> ToggleCameraAction;

private:
	void BuildDefaultInputIfMissing();
	void AddMappingContextToLocalPlayer();

	void HandleMove(const FInputActionValue& Value);
	void HandleLook(const FInputActionValue& Value);
	void HandleSprintStarted() { SetSprinting(true); }
	void HandleSprintStopped() { SetSprinting(false); }

	void ShowTouchControlsIfNeeded();
	void HideTouchControls();

	TSharedPtr<class SWidget> TouchControlsWidget;

	void DebugMessage(const FString& Message) const;

	EOTDCameraMode CameraMode = EOTDCameraMode::ThirdPerson;
	bool bIsSprinting = false;
};
